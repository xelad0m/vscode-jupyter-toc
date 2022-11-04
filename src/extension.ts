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
		} else {
			vscode.window.showInformationMessage('This command is only suitable for Jupyter notebooks');
		}
		console.log("Command 'jupyter-toc.jupyterToc' executed");
	});

	let command2 = vscode.commands.registerCommand('jupyter-toc.jupyterUnToc', () => {
		if (vscode.window.activeNotebookEditor?.notebook !== undefined) {
			console.log("Start removing TOC...")
			new TocGenerator().remove();
		} else {
			vscode.window.showInformationMessage('This command is only suitable for Jupyter notebooks');
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
	private _tocStartLine: string  = "<!-- vscode-jupyter-toc -->";
	private _tocDisclimer: string = "<!-- THIS CELL WILL BE REPLACED ON TOC UPDATE. DO NOT WRITE YOUR TEXT IN THIS CELL -->";
	private _tocEndLine: string  = "<!-- /vscode-jupyter-toc -->";
	private _endAnchor: string = "</a>";
	
	remove() {
		let editor = vscode.window.activeNotebookEditor;

		if (editor != undefined) {
			let cells = editor.notebook.getCells();
			let uri = editor.notebook.uri;

			if (cells != undefined) {
				this._config = this.readConfiguration(cells);
				if (this._config.TocCellNum == undefined) {
					vscode.window.showInformationMessage('Table of content not found in this notebook');
					return
				}

				let lineHeaders = this.buildLineHeaders(cells);						// all valid headers in notebook as is
				cells.forEach((cell, cellIndex)  => {					
					if (vscode.NotebookCellKind[cell.kind] == 'Markup') {
						let docText = cell.document.getText();
						let docArray = docText.split(/\r?\n/);
						let isCellUpdate = false;

						// clear all headers formatting in cell (remove numbering and anchors)
						lineHeaders.ForEach(header => {
							if (header != undefined && header.cellNum != undefined && header.cellNum == cellIndex) {
								isCellUpdate = true;
								let ht = "#".repeat(header.origLevel);
								let lineText = `${ht} ${header.title}`;
								docArray[header.lineNumber] = lineText;
							}
						});

						docText = docArray.join("\n");	// cell content with edits

						if (isCellUpdate && editor != undefined) {
							this.updateCell(editor.notebook.uri, docText, cellIndex);
						}
					}
				});

				// delete TOC cell from document
				if (this._config.TocCellNum != undefined) {
					this.deleteCell(uri, this._config.TocCellNum);	
				}

				// save notebook
				if(this._config.AutoSave) {
					editor.notebook.save();
				}
				vscode.window.showInformationMessage("Table of content removed. Headers cleared");
			}

			return Promise.resolve();
		}
	}

	process(){
		let editor = vscode.window.activeNotebookEditor;
		let infoMessage = "";
		
		if (editor != undefined) {
			let cells = editor.notebook.getCells();
			
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
								isCellUpdate = true;
								let ht = "#".repeat(header.origLevel);
								let lineText = `${ht} ${header.title}`;
								docArray[header.lineNumber] = lineText;
							}
						});

						// format filtered levels of headers
						headers.ForEach(header => {	/* edit cell content for each header in current cell */
							if (header != undefined && header.cellNum != undefined && header.cellNum == cellIndex) {
								isCellUpdate = true;
								
								let ht = "#".repeat(header.origLevel);
								let anchor = `<a id='${header.anchor}'></a>`;
								let title = (this._config.Anchor) ? `[${header.title}](#toc0_)` : header.title;

								let lineText = "";
								if (this._config.Numbering && this._config.Anchor) {
									lineText = `${ht} ${header.numberingString} ${anchor}${title}`;
								} else if (this._config.Anchor) {
									lineText = `${ht} ${anchor}${title}`;
								} else if (this._config.Numbering) {
									lineText = `${ht} ${header.numberingString} ${title}`;
								} else {
									lineText = `${ht} ${title}`;
								}
									  
								docArray[header.lineNumber] = lineText;
							}
						});	
						
						docText = docArray.join("\n");	// cell content with edits

						if (isCellUpdate && editor != undefined) {
							this.updateCell(editor.notebook.uri, docText, cellIndex);
						}
					}
				});

				// insert TOC in document
				if (this._config.TocCellNum == undefined) {								// if there is no TOC in notebook
					let selected = (editor.selection != undefined) ? editor.selection.start : 0;	// ? rarely it could be no selection
					this.insertCell(editor.notebook.uri, tocSummary, selected);			// insert before selected cells
					infoMessage = `Table of contents inserted as Cell #${selected}`;	
				} else {																// else update existing TOC (first if many) by replace
					let tocCellNum = this._config.TocCellNum;
					this.updateCell(editor.notebook.uri, tocSummary, tocCellNum);
					infoMessage = `Table of contents updated at Cell #${tocCellNum}`;	
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
					if(lineText.startsWith(tocConfiguration.EndLine)) {
						// this._tocEndLineNumber = lineNumber;
						break;
					}
			
					if(lineText.startsWith(tocConfiguration.StartLine)) {
						readingConfiguration = true;
						tocConfiguration.TocCellNum = cellIndex;
						// this._tocStartLineNumber = lineNumber;
						continue;
					}
			
					if(readingConfiguration) {
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
						let headerLevel : number = lineText.indexOf(" ");
						
						// skip not valid strings
						if (headerLevel > MD_MAX_HEADERS_LEVEL) {
							continue
						}
						
						// Remove numbering in the title
						if (lineText.match(/\#+\s([0-9]+\.)+/) != null) {
							lineText = lineText.replace(/([0-9]+\.)+\s/, "");
						}
						
						// Remove hashtag
						let title: string = lineText.substring(headerLevel + 1);

						// Remove anchor in the title
						if (title.indexOf(this._endAnchor) > 0) {
							title = title.substring(title.indexOf(this._endAnchor)  + this._endAnchor.length);
						}

						// Unlink title if it in markdown link: [title](#id)
						if (title.startsWith("[")) {
							title = title.slice(1).replace(/\].*/, "");
						}
				
						let header = new Header(
							headerLevel,
							title, 
							lineNumber, 
							lineText.length);
						
						header.cellNum = cellIndex;
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
		let prevLevel = 0;
	
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
				
				// Have to set to 1 all skipped levels higher than current (i.e. kind broken TOC structure,
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
	  	let tocSummary : string = this._tocStartLine + "\n" + 
								  this._tocDisclimer + "\n" + 
								  "<a id='toc0_'></a>" + this._config.TocHeader + "    \n";
		
	  	headers.ForEach(header => {
			if (header != undefined) {
				let tocLine : string = "";
				let indent = "  ".repeat(header.level - 1);

				if (this._config.Numbering && this._config.Anchor) {
					tocLine = `${indent}- ${header.numberingString} [${header.title}](#${header.anchor})`;
				} else if (this._config.Anchor) {
					tocLine = `${indent}- [${header.title}](#${header.anchor})`;
				} else if (this._config.Numbering) {
					tocLine = `${indent}- ${header.numberingString} ${header.title}`;
				} else {
					tocLine = `${indent}- ${header.title}`;
				}
				
				// finalize line
				if(tocLine != null && tocLine != ""){
					tocSummary = tocSummary.concat(tocLine + "    \n");	// tab or 4 spaces (needed by deep levels)
				}
			}
		});
  
		tocSummary = tocSummary.concat("\n" + this._config.Build());
		tocSummary = tocSummary.concat("\n" + this._tocEndLine);
	
		return tocSummary;
	}
}
  
function isEmptyOrWhitespace (text: string): boolean {
	return (!text || text.trim() === "");
};

function isCodeBlockIndent (text: string): boolean {
	return (text.search(/[^\s]./) > 3 || text.startsWith('\t')); // 4+ spaces or 1+ tab
};


class TocConfiguration {
	public Numbering: boolean;
	public Anchor: boolean;
	public AutoSave: boolean;
	public MinLevel: number;
	public MaxLevel: number;
  
	public StartLine: string = "<!-- vscode-jupyter-toc-config";
	public EndLine: string = "/vscode-jupyter-toc-config -->";
	public TocHeader: string;
	public TocCellNum?: number;
  
	private _numberingKey: string 	= "numbering=";
	private _anchorKey: string 		= "anchor=";
	private _autoSaveKey: string 	= "autoSave=";
	private _minLevelKey: string 	= "minLevel=";
	private _maxLevelKey: string 	= "maxLevel=";
  
	constructor() {
			this.Numbering = vscode.workspace.getConfiguration('jupyter.toc').get('numbering', true);
			this.Anchor = vscode.workspace.getConfiguration('jupyter.toc').get('anchors', true);
			this.AutoSave = vscode.workspace.getConfiguration('jupyter.toc').get('autoSave', true);
			this.MinLevel = vscode.workspace.getConfiguration('jupyter.toc').get('minHeaderLevel', 1);
			this.MaxLevel = vscode.workspace.getConfiguration('jupyter.toc').get('maxHeaderLevel', 6);
			this.TocHeader = vscode.workspace.getConfiguration('jupyter.toc').get('tocHeader', "Table of contents");
	}
  
	public Read(lineText: string) {
		if(this.readable(lineText, this._numberingKey)) {
			this.Numbering = this.toBoolean(lineText, this._numberingKey);
		} else if (this.readable(lineText, this._autoSaveKey)) {
			this.AutoSave = this.toBoolean(lineText, this._autoSaveKey);
		} else if (this.readable(lineText, this._anchorKey)) {
			this.Anchor = this.toBoolean(lineText, this._anchorKey);
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
		// configuration = configuration.concat("\n\t" + this._autoSaveKey + this.AutoSave);
		configuration = configuration.concat("\n\t" + this._anchorKey + this.Anchor);
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
	level: number;				// representation header level (relative to min level)
	origLevel: number;			// header level as it was in original document
	title: string;
	numbering: Array<number>;
	numberingString: string;
	lineNumber: number;
	lineLength: number;
	cellNum?: number;
	anchor?: string;
  
	constructor(headerLevel: number,
		title: string,
		lineNumber: number,
		lineLength: number) {
			this.level = headerLevel;
			this.origLevel = headerLevel;
			this.title = title;
			this.numbering = [];
			this.numberingString = "";
			this.lineNumber = lineNumber;
			this.lineLength = lineLength;
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