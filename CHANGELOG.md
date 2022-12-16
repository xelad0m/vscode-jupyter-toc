# Change Log

## [Unreleased]

### TODO

- [ ] Figure out how vscode scrolling works for precise navigation

## v0.2.1 (16 December 2022)

### Fixed

- [x] Empty link from header to Toc may remove header on update

## v0.2.0 (4 December 2022)

### Changed

- [x] Toc cell content rearranged (not backward compatible)

## v0.1.9 (4 December 2022)

### Fixed

- [x] Toc cell represents as 'empty cell' in builtin outline panel

## v0.1.7 (14 November 2022)

## Fixed

- [x] Correct processing of date-like numbers at the begining of title
    - It means updating only dot separated numbering of title, preserving all other numbers in title
- [x] Preserving the name of TOC if it was customized

## v0.1.5 (10 November 2022)

### Removed 

- Explicite extension dependencies. This is not necessary, everything works without `ms-toolsai.jupyter` 

## v0.1.3 (9 November 2022)

### Added 

- Explicite extension dependencies

### Fixed

- Some minor fixes

## v0.1.1 (8 November 2022)

### Added

- Flat table of contents option
 
## v0.1.0 (7 November 2022)

### Fixed

- Some minor fixes

## v0.0.5 (7 November 2022)

### Fixed

- More precise processing of some rare specific header variants
- Inaccuracies in README.md and option descriptions

## v0.0.3 (6 November 2022)

### Added

- Ajustable reverse links from title to the table of contents 

## v0.0.2 (6 November 2022)

### Added

- Editor title menu items to generate and remove table of contents

### Changed

- Renamed command titles

## v0.0.1 (5 November 2022)

### Thanks

- [Markdown TOC](https://marketplace.visualstudio.com/items?itemName=joffreykern.markdown-toc)
- [Joffrey Kern](https://github.com/joffreykern/vscode-markdown-toc)
- [Kiran Rao](https://github.com/curioustechizen/vscode-markdown-toc)
- [Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension)