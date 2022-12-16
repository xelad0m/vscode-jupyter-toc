// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { List } from 'linqts';

const MD_MAX_HEADERS_LEVEL = 6;
const MD_LANG_ID = "markdown";
const MD_CELL_KIND = vscode.NotebookCellKind["Markup"];

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "jupyter-toc" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let command1 = vscode.commands.registerCommand('jupyter-toc.jupyterToc', () => {
        if (vscode.window.activeNotebookEditor?.notebook !== undefined) {
            console.log("Start building TOC...")
            new TocGenerator().process();
        }
        console.log("Command 'jupyter-toc.jupyterToc' executed");
    });

    let command2 = vscode.commands.registerCommand('jupyter-toc.jupyterUnToc', () => {
        if (vscode.window.activeNotebookEditor?.notebook !== undefined) {
            console.log("Start removing TOC...")
            new TocGenerator().process(true);
        }
        console.log("Command 'jupyter-toc.jupyterUnToc' executed");
    });
    
    context.subscriptions.push(command1);
    context.subscriptions.push(command2);
}

// This method is called when your extension is deactivated
export function deactivate() {};


export class TocGenerator {
    private _config: TocConfiguration = new TocConfiguration();
    private _tocDisclimer: string = "<!-- THIS CELL WILL BE REPLACED ON TOC UPDATE. DO NOT WRITE YOUR TEXT IN THIS CELL -->";
    private _tocHeaderAnchor: string = "<a id='toc0_'></a>";
    private _endAnchor: string = "</a>";
    
    process(remove: boolean = false){
        let editor = vscode.window.activeNotebookEditor;
        let infoMessage = "";
        
        if (editor != undefined) {
            let cells = editor.notebook.getCells();
            let uri = editor.notebook.uri;
            
            if (cells != undefined) {
                // prepare TOC
                this._config = this.readConfiguration(cells);
                let lineHeaders = this.buildLineHeaders(cells);		// all valid headers in notebook
                let headers = this.buildHeaders(lineHeaders);		// filtered, numbered and anchored headers
                let tocSummary : string = this.buildSummary(headers);
                console.log(tocSummary);
                
                // edit headers in document
                cells.forEach((cell, cellIndex)  => {     		
                    if (vscode.NotebookCellKind[cell.kind] == 'Markup') {
                        let docText = cell.document.getText();
                        let docArray = docText.split(/\r?\n/);
                        let isCellUpdate = false;

                        // clear all headers formatting in cell
                        lineHeaders.ForEach(header => {	/* edit cell content for each header in current cell */
                            if (header != undefined && header.cellNum != undefined && header.cellNum == cellIndex) {
                                let ht = "#".repeat(header.origLevel);
                                let lineText = `${ht} ${header.title}`;
                                docArray[header.lineNumber] = lineText;
                                isCellUpdate = true;
                            }
                        });

                        if (!remove) { // format filtered levels of headers
                            headers.ForEach(header => {	/* edit cell content for each header in current cell */
                                if (header != undefined && header.cellNum != undefined && header.cellNum == cellIndex) {                                
                                    let ht = "#".repeat(header.origLevel);
                                    let title = this.anchorHeader(header); // anchor header
                                    title = (this._config.Numbering) ? `${ht} ${header.numberingString} ${title}` : `${ht} ${title}`; // number header
                                    docArray[header.lineNumber] = title;                
                                    isCellUpdate = true;
                                }
                            });	
                        }

                        docText = docArray.join("\n");	// cell content with edits

                        if (isCellUpdate && editor != undefined) {
                            this.updateCell(uri, docText, cellIndex);
                        }
                    }
                });

                if (remove) { // remove TOC cell
                    if (this._config.TocCellNum != undefined) {
                        this.deleteCell(uri, this._config.TocCellNum);	
                    }
                } else { // insert or update TOC cell
                    if (this._config.TocCellNum == undefined) { // if there is no TOC in notebook
                        let selected = (editor.selection != undefined) ? editor.selection.start : 0; // ? rarely it could be no selection
                        this.insertCell(uri, tocSummary, selected); // insert before selected cells
                        infoMessage = `Table of contents inserted as Cell #${selected}`;	
                    } else { // else update existing TOC (first if many) by replace
                        let tocCellNum = this._config.TocCellNum;
                        this.updateCell(uri, tocSummary, tocCellNum);
                        infoMessage = `Table of contents updated at Cell #${tocCellNum}`;	
                    }
                }

                // save notebook
                if(this._config.AutoSave) {
                    editor.notebook.save();
                }
                
                vscode.window.showInformationMessage(infoMessage);
            }
                
            return Promise.resolve();
        }
    }

    private anchorHeader(header: Header): string {
        let title = header.title;

        if (this._config.Anchor) {
            let anchor = `<a id='${header.anchor}'></a>`;

            switch ( this._config.AnchorStyle ) {
                case "arrow1":
                    title = `${anchor}${title} [&#8593;](#toc0_)`;
                    break;
                case "arrow2":
                    title = ` [&#8593;](#toc0_) ${anchor}${title}`;
                    break;
                case "arrow3":
                    title = `${anchor}${title} [&#9650;](#toc0_)`;
                    break;
                case "arrow4":
                    title = ` [&#9650;](#toc0_) ${anchor}${title}`;
                    break;
                case "title":
                    title = (header.isContainLinks) ? `${anchor}${title} [&#8593;](#toc0_)` : `${anchor}[${title}](#toc0_)`;
                    break;
                case "custom":
                    title = `${anchor}${title} [${this._config.CustomAnchor}](#toc0_)`;
                    break;   
                default: 
                    title = `${anchor}${title} [&#8593;](#toc0_)`;
                    break;
            }
        }

        return title;
    }

    private async deleteCell(uri: vscode.Uri, cellNum: number) {
        const edit = new vscode.WorkspaceEdit();
        let range = new vscode.NotebookRange(cellNum, cellNum + 1);
        edit.set(uri, [vscode.NotebookEdit.deleteCells(range)]);
        await vscode.workspace.applyEdit(edit);
    }

    private async insertCell(uri: vscode.Uri, docText: string, cellNum: number) {
        const edit = new vscode.WorkspaceEdit();
        let tocCell = new vscode.NotebookCellData(MD_CELL_KIND, docText, MD_LANG_ID);	
        edit.set(uri, [vscode.NotebookEdit.insertCells(cellNum, [tocCell])]);
        await vscode.workspace.applyEdit(edit);
    }

    private async updateCell(uri: vscode.Uri, docText: string, cellNum: number){
        const edit = new vscode.WorkspaceEdit();
        let range = new vscode.NotebookRange(cellNum, cellNum + 1);
        let tocCell = new vscode.NotebookCellData(MD_CELL_KIND, docText, MD_LANG_ID);	
        edit.set(uri, [vscode.NotebookEdit.replaceCells(range, [tocCell])]);
        await vscode.workspace.applyEdit(edit);
    }

    readConfiguration(cells: vscode.NotebookCell[]) : TocConfiguration {
        let tocConfiguration: TocConfiguration = new TocConfiguration();
        let readingConfiguration: boolean = false;
        
        cells.forEach((cell, cellIndex)  => {
            if (vscode.NotebookCellKind[cell.kind] == 'Markup') {
                let docText = cell.document.getText();
                let docArray = docText.split(/\r?\n/);
                
                for (var lineNumber = 0; lineNumber < docArray.length ; lineNumber++) {
                    let lineText: string = docArray[lineNumber].trim();
            
                    // Break the loop, cause we read the configuration,
                    // so if several TOC in doc we read config from the first
                    if (lineText.startsWith(tocConfiguration.EndLine)) {
                        break;
                    }

                    if (lineText.startsWith(tocConfiguration.StartLine)) {
                        readingConfiguration = true;
                        tocConfiguration.TocCellNum = cellIndex;
                        
                        let tocHeader = docArray[0].trim();  /* preserve modified header of Toc */
                        tocConfiguration.TocHeader = tocHeader.replace(this._tocHeaderAnchor, "");
                        continue;
                    }

                    if (readingConfiguration) {
                        tocConfiguration.Read(lineText);
                    }
                
                }
            }
        });
    
        return tocConfiguration;
    }

    // collect all valid headers from notebook to list
    buildLineHeaders(cells: vscode.NotebookCell[]) : List<Header> {
        let headers = new List<Header>();
        let insideTripleBacktickCodeBlock: boolean = false;
        
        cells.forEach((cell, cellIndex)  => {
            if (vscode.NotebookCellKind[cell.kind] == 'Markup') {
                let docText = cell.document.getText();
                let docArray = docText.split(/\r?\n/);

                for (var lineNumber = 0; lineNumber < docArray.length; lineNumber++) {
                    let aLine = docArray[lineNumber];
            
                    //Ignore empty lines and pre-formatted code blocks in the markdown
                    if (isEmptyOrWhitespace(aLine) || isCodeBlockIndent(aLine)) continue;
                    
                    let lineText = aLine.trim();
                                        
                    //If we are within a triple-backtick code blocks, then ignore
                    if(lineText.startsWith("```")) {
                        insideTripleBacktickCodeBlock = !insideTripleBacktickCodeBlock;
                    }
            
                    if(insideTripleBacktickCodeBlock){
                        continue;	
                    }
                    
                    // if it is possible header
                    if(lineText.startsWith("#")) {
                        let headerLevel : number = getHeaderLevel(lineText);
                        
                        // skip not valid strings (error || more than 6 #)
                        if (headerLevel < 1 || headerLevel > MD_MAX_HEADERS_LEVEL) {
                            continue
                        }
                        
                        let [title, cleanTitle, isContainLinks] = this.normalizeHeader(lineText, headerLevel, this._endAnchor);
                
                        let header = new Header(
                            headerLevel,
                            title, 
                            cleanTitle,
                            isContainLinks,
                            lineNumber, 
                            cellIndex);
                        
                        headers.Add(header);
                    }
                }
            }
        })
    
        return headers;
    }

    // filter headers by level, add to headers numbering and anchors
    buildHeaders(lines: List<Header>) : List<Header> {
        let headers : List<Header> = new List<Header>();
        let levels = new Array<number>(); 
    
        for (var index = this._config.MinLevel; index <= this._config.MaxLevel; index++) {
            levels.push(0);
        }
        
        // normalize levels, add numbering with string
        lines.Where(x => x != undefined && x.level >= this._config.MinLevel && x.level <= this._config.MaxLevel).ForEach(header => {
            if (header != undefined) {	/* Why? */ 
                
                header.level = header.level - this._config.MinLevel + 1;	// scale level to min level

                // Have to reset the sublevels (deeper than current)
                for (var lvl = header.level; lvl < MD_MAX_HEADERS_LEVEL; lvl++) {
                    levels[lvl] = 0;
                }
                
                // Have to set to 1 all skipped levels higher than current (i.e. kind of broken TOC structure,
                // like level 5 header follows level 3 header (1.1.1 -> 1.1.1.0.1 -> 1.1.1.1.1)
                for (var lvl = 0; lvl < header.level - 1 ; lvl++) {
                    if (levels[lvl] == 0) {	
                        levels[lvl] = 1
                    };
                }

                // increment current level
                levels[header.level - 1]++;
                    
                header.numbering = Object.assign([], levels);	// copy array of primitive types
                header.setNumberingString();
                header.setAnchor();

                headers.Add(header);
            }
        });
          
      return headers;
    }

    // build string representation of table of contents
    buildSummary(headers : List<Header>) : string {
        let tocHeaderAnchor =  (this._config.Anchor) ? this._tocHeaderAnchor : "";
        let tocSummary : string = this._config.TocHeader + tocHeaderAnchor + "    \n";
        
        headers.ForEach((header, idx) => {
            if (header != undefined) {
                let title = header.cleanTitle;  // we want to push to anchored TOC the header without links
                let tocLine = "";
                let indent = "";

                if (!this._config.Flat) {
                    indent = (idx == 0) ? "" : "  ".repeat(header.level - 1);    // first header never indents or it will be ugly rendered in md list
                    indent = indent.concat("- ");
                }
                
                if (this._config.Numbering && this._config.Anchor) {
                    tocLine = `${indent}${header.numberingString} [${title}](#${header.anchor})`;
                } else if (this._config.Anchor) {
                    tocLine = `${indent}[${title}](#${header.anchor})`;
                } else if (this._config.Numbering) {
                    tocLine = `${indent}${header.numberingString} ${title}`;
                } else {
                    tocLine = `${indent}${title}`;
                }
                
                // finalize line
                if(tocLine != null && tocLine != ""){
                    tocSummary = tocSummary.concat(tocLine + "    \n");	// tab or 4 spaces (needed by deep levels)
                }
            }
        });
  
        tocSummary = tocSummary.concat("\n" + this._config.Build());
        tocSummary = tocSummary.concat("\n" + this._tocDisclimer);
    
        return tocSummary;
    }

    /**
     * 
     * @returns [ cleaned from numbering and anchor header sting (to keep in Cells), 
     *            cleaned from links title (to push to TOC),
     *            flag whether string contain other links ]
     */
    public normalizeHeader(validHeader: string, 
                           headerLevel: number, 
                           endAnchor: string): [string, string, boolean] {
        let isContainLinks = false;

        // remove numbering
        if (validHeader.match(/^\#+\s+([0-9]+\.+)+\s*/) != null) {          // is there some numbering in header after '# ' at the begining of string?
            validHeader = validHeader.replace(/\s*([0-9]+\.*)+\s*/, " ");	// del first numbering, keep if numbers further in the title
        }
        
        // remove hashtag
        let title: string = validHeader.substring(headerLevel + 1);

        // remove anchor
        if (title.indexOf(endAnchor) > 0) {
            title = title.substring(title.indexOf(endAnchor)  + endAnchor.length);
        }

        // remove TOC link
        const reTocLink = /\[(?<name>[^\[\]]*)\]\(#toc0_\)/;                // any #toc0_ link including empty
        if (reTocLink.test(title)) {           
            let m = title.match(reTocLink);
            if (m != null) {
                let link = m[0];
                let name = m[1];
                title = ((this._config.AnchorStrings.indexOf(name) < 0) && (name != "")) ? name : title.replace(link, "");
            }
        }

        // remove other title links
        const reLink = /\[(?<name>.+?)\]\(.+?\)/;
        let cleanTitle = title;
        if (reLink.test(title)) {
            isContainLinks = true;
            cleanTitle = removeLinks(title);
        }

        return ([title, cleanTitle, isContainLinks]);
    }
}
  
function isEmptyOrWhitespace (text: string): boolean {
    return (!text || text.trim() === "");
};

function isCodeBlockIndent (text: string): boolean {
    return (text.search(/[^\s]./) > 3 || text.startsWith('\t')); // 4+ spaces or 1+ tab
};

function getHeaderLevel(line: string, keepEmpty: boolean = false): number {
    line = line.trim();
    let tag = line.split(" ")[0];
    let hTag = "";

    if (!keepEmpty && line.split(" ").length == 1) {	// empty title
        return -1;
    }

    let hTagMatch = tag.match(/\#+/);

    if (hTagMatch == null) {          	// overcheck if there is no #
        return -1;
    } else {
        hTag = hTagMatch[0];
    }
    
    if (hTag.length < tag.length) {          // there are other than # symbols
        return -1;
    }

    return hTag.length;
}

function removeLinks(line: string): string {
    const reLink = /\[(?<name>.+?)\]\(.+?\)/;
    while (reLink.test(line)) {
        let m = line.match(reLink);
        if (m != null) {
            let link = m[0];
            let name = m[1];
            line = line.slice(0, m.index) + line.slice(m.index).replace(link, name);
        } else {
            break
        }
    }
    return line;
}

class TocConfiguration {
    public TocHeader: string;
    public Numbering: boolean;
    public Flat: boolean;
    public Anchor: boolean;
    public AnchorStyle: string;
    public CustomAnchor: string;
    public MinLevel: number;
    public MaxLevel: number;
    public AutoSave: boolean;
    public AnchorStrings: Array<string>;    // 2 hardcoded and 1 custom strings for anchors 
    public StartLine: string = "<!-- vscode-jupyter-toc-config";
    public EndLine: string = "/vscode-jupyter-toc-config -->";

    public TocCellNum?: number;             // ? because we cant set it in constructor
  
    private _numberingKey: string 	= "numbering=";
    private _anchorKey: string 		= "anchor=";
    private _flatKey: string 		= "flat=";
    private _minLevelKey: string 	= "minLevel=";
    private _maxLevelKey: string 	= "maxLevel=";
  
    constructor() {
        this.TocHeader = vscode.workspace.getConfiguration('jupyter.toc').get('tableOfContentsHeader', "**Table of contents**");
        this.Numbering = vscode.workspace.getConfiguration('jupyter.toc').get('numbering', false);
        this.Flat = vscode.workspace.getConfiguration('jupyter.toc').get('flat', false);
        this.Anchor = vscode.workspace.getConfiguration('jupyter.toc').get('anchors', true);
        this.AnchorStyle = vscode.workspace.getConfiguration('jupyter.toc').get('reverseAnchorsStyle', "arrow1");
        this.CustomAnchor = vscode.workspace.getConfiguration('jupyter.toc').get('customReverseAnchor', "&#9757;");
        this.MinLevel = vscode.workspace.getConfiguration('jupyter.toc').get('minHeaderLevel', 1);
        this.MaxLevel = vscode.workspace.getConfiguration('jupyter.toc').get('maxHeaderLevel', 6);
        this.AutoSave = vscode.workspace.getConfiguration('jupyter.toc').get('autoSave', false);
        this.AnchorStrings = ["&#8593;", "&#9650;", this.CustomAnchor];
    }
  
    public Read(lineText: string) {
        if(this.readable(lineText, this._numberingKey)) {
            this.Numbering = this.toBoolean(lineText, this._numberingKey);
        } else if (this.readable(lineText, this._anchorKey)) {
            this.Anchor = this.toBoolean(lineText, this._anchorKey);
        } else if (this.readable(lineText, this._flatKey)) {
            this.Flat = this.toBoolean(lineText, this._flatKey);
        } else if (this.readable(lineText, this._minLevelKey)) {
            let num = this.toNumber(lineText, this._minLevelKey);
            this.MinLevel = (num < 1) ? 1 : num;
        } else if (this.readable(lineText, this._maxLevelKey)) {
            let num = this.toNumber(lineText, this._maxLevelKey);
            this.MaxLevel = (num > MD_MAX_HEADERS_LEVEL) ? MD_MAX_HEADERS_LEVEL : num;
        }
    }
  
    public Build() : string {
        let configuration : string = this.StartLine;
        configuration = configuration.concat("\n\t" + this._numberingKey + this.Numbering);
        configuration = configuration.concat("\n\t" + this._anchorKey + this.Anchor);
        configuration = configuration.concat("\n\t" + this._flatKey + this.Flat);
        configuration = configuration.concat("\n\t" + this._minLevelKey + this.MinLevel);
        configuration = configuration.concat("\n\t" + this._maxLevelKey + this.MaxLevel);
        configuration = configuration.concat("\n\t" + this.EndLine);
    
        return configuration;
    }
  
    private readable(lineText: string, key:string): boolean {
          return (lineText.startsWith(key));
    }
  
    private toBoolean(lineText: string, key: string) : boolean {
        lineText = this.extractValue(lineText, key);
        return (lineText.startsWith("y") || lineText.startsWith("true"));
    }
  
    private toNumber(lineText: string, key: string) : number {
          return Number.parseInt(this.extractValue(lineText, key));
    }
  
    private extractValue(lineText: string, key: string) : string {
          return lineText.slice(key.length, lineText.length).trim().toLowerCase();
    }
}
  

/**
 * Header
 */
class Header {
    level: number;     	// representation header level (relative to min level)
    origLevel: number;     // header level as it was in original document
    title: string;     	// orig title, possible with links on some its parts
    cleanTitle: string;     // title without links to push it in anchored TOC
    isContainLinks: boolean;	// is there are links in original title flag
    numbering: Array<number>;
    numberingString: string;
    lineNumber: number;
    cellNum: number;
    anchor?: string;
  
    constructor(headerLevel: number,
        title: string,
        cleanTitle: string,
        isContainLinks: boolean,	
        lineNumber: number,
        cellNum: number) {
            this.level = headerLevel;
            this.origLevel = headerLevel;
            this.title = title;
            this.cleanTitle = cleanTitle;
            this.isContainLinks = isContainLinks;
            this.numbering = [];
            this.numberingString = "";
            this.lineNumber = lineNumber, 
            this.cellNum = cellNum;
    }

    public setNumberingString() {
        let numberingString = "";
        
        for (let i = 0; i <= MD_MAX_HEADERS_LEVEL; i++){
            if(this.numbering[i] > 0) {
                numberingString = numberingString.concat(this.numbering[i] + ".");
            }
        }

        this.numberingString = numberingString;
    }

    public setAnchor() {
        if (this.numberingString != "") {
            this.anchor = "toc" + this.numberingString.split('.').join('_');	// replaceAll
        }
    }
}
