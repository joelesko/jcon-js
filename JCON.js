const fs = require('fs');

class JCON {

    constructor() {

        this.braceToType = {
            '{': 'map',
            '[': 'list',
            '`': 'string'
        };

        this.typeToBrace = {
            'map': '}',
            'list': ']',
            'string': '`'
        };
    }

    error(msg) {
        throw msg + '  \n[line ' + this.cursor.lineNum + '] ' + this.cursor.line.trim();
    }

    resetState(fullText, options) {

        this.fullText = fullText;
        this.fullTextLen = fullText.length;

        this.options = options || {};

        this.containerStack = [];
        this.container = { isRoot: true, data: [] };
        
        this.cursor = {
            charPos: 0,
            lineNum: 0,
            line: '',
            isEndOfFile: false,
        };      
    }

    parseFile(filePath, cb) {
        fs.readFile(filePath, 'utf8', (err, text)=>{
            if (err) {
                throw "Unable to read file " + filePath + ': ' + err;
            }
            let data = this.parse(text);
            cb(data);
        });
    }

    parse(fullText, options) {

        if (!fullText.length) {
            this.error('Empty JCON string.');
        }

        this.resetState(fullText, options);

        while (true) {
            let line = this.getNextLine();
            this.parseLine(line);
            if (this.cursor.atEndOfFile) { 
                break; 
            }
        }

        this.validateResult();

        return this.container.data[0];
    }

    getNextLine() {

        this.cursor.lineNum += 1;

        let line = '';
        
        while (true) {

            if (this.cursor.charPos >= this.fullTextLen) {
                this.cursor.atEndOfFile = true;
                break;
            }

            let char = this.fullText[this.cursor.charPos];
            this.cursor.charPos += 1;

            if (char == "\r") {
                continue;
            }
            else if (char == "\n") {
                break;
            }

            line += char;
        }

        this.cursor.line = line;

        return line;
    }

    parseLine(rawLine) {

        let inString = this.container.type == 'string';

        let line = rawLine.trim();

        if (!line.length && !inString) { 
            // skip blank line
            return; 
        }

        let c0 = line.charAt(0);
        let c1 = line.charAt(1);

        if (c0 == this.container.closeBrace) {
            if (c1 != '') {
                this.error("Missing newline after closing delimiter '" + c0 + "'.");
            }
            this.closeContainer();
        }
        else if (inString) {
            this.container.data.push(rawLine);
        }
        else if (c0 == '/' && c1 == '/') { 
            // skip comment
            return;
        }
        else {
            let kv = this.parseConfigLine(line);
            this.handleKeyValue(kv[0], kv[1]);
        }
    }

    parseConfigLine(line) {

        let key = '';
        let val = line;

        // Key/value for map
        if (this.container['type'] == 'map') {
            
            let parts = line.split(': ', 2);

            key = parts[0];
            val = parts[1]; 

            if (parts.length < 2) { 
                if (line.indexOf(':') > -1) {
                    this.error("Missing space after colon ':'."); 
                } else {
                    this.error("Missing colon ':' for key/value pair."); 
                }
            }
            else if (this.container.data.hasOwnProperty(key)) { 
                this.error("Duplicate key: '" + key + "'.");
            }
            else if (key.slice(-1) == ' ') {
                this.error("Unexpected space before colon ':'");    
            }             
        }

        val = val.trim();

        return [key, val];
    }

    handleKeyValue(key, val) {

        let v0 = val.charAt(0);
        let v1 = val.charAt(1);
 
        if (this.braceToType[v0]) {
            this.openContainer(this.braceToType[v0], key, v0, v1);
        }
        else {
            // literal value
            let typedVal = this.stringToTypedValue(val);
            this.storeValue(key, typedVal);
        }
    }

    // start of new container (list, map, string)
    openContainer(type, parentKey, c0, c1) {

        if (c1 !== '') {
            this.error("Missing newline after open delimiter '" + c0 + "'.");
        }

        // push parent onto stack
        this.containerStack.push(this.container);

        this.container = {
            type: type, 
            parentKey: parentKey,
            closeBrace: this.typeToBrace[type],
            data: (type == 'map') ? {} : []
        };
    }

    closeContainer() {

        let childContainer = this.container;
        this.container = this.containerStack.pop();

        if (childContainer.type == 'string') {
            childContainer.data = this.trimIndent(childContainer.data);
        }

        this.storeValue(childContainer.parentKey, childContainer.data);
    }

    storeValue(key, val) {
    
        if (typeof val == 'string') {
            if (this.options.onParseValue) {
                val = this.options.onParseValue(val, key);
            }
        }   
        
        let data = this.container.data;
        if (this.container.type == 'map') {
            data[key] = val;
        }
        else {
            data.push(val);
        }
    }

    // Convert a text value into a typed version 
    // e.g. "123" => 123 [number], "true" => true [boolean]
    stringToTypedValue(val) {

        let v = val;
        if (val === 'true') {
            v = true;
        }
        else if (val === 'false') {
            v = false;
        }
        else if (val.match(/^-?[0-9\.]+/)) {
            if (val.indexOf('.') > -1) {
                v = parseFloat(val);
            } else {
                v = parseInt(val);
            }
        }
        
        return v;
    }

    validateResult() {

        if (this.containerStack.length > 0) {
            let missingBrace = this.typeToBrace[this.container.type];
            this.error("Reached end of file with unclosed '" + missingBrace + "'");
        }
        if (!this.container.isRoot) {
            this.error('Unable to parse JCON.');
        }
    }

    trimIndent(lines) {

        let numLines = lines.length;

        // Find the smallest level of indent
        let minIndent = 9999;
        for (let i = 0; i < numLines; i++) {
            lines[i] = lines[i].replace('\t', '    ');
            let indent = lines[i].match(/^(\s*)/)[1];
            if (indent != lines[i].length) {
                minIndent = Math.min(indent.length, minIndent);
            }
        }
        
        // Trim indent from all lines
        let out = '';
        for (let i = 0; i < numLines; i++) {
            out += lines[i].slice(minIndent) + "\n";
        }

        out = out.replace(/\n+$/, '');
        out = out.replace(/^\n+/, '');

        return out;
    } 
}

module.exports = new JCON ();

