## Summary
JCON is a configuration format that keeps the familiarity of JSON, but requires less syntax -- making it easier to read and write.

[JCON Home Page](https://jconformat.org)

## Features
- Separation by line breaks, not commas.
- No quotation marks for strings or keys.
- Support for line comments.
- Support for multi-line strings.
- Small footprint (~ 7k). No dependencies.

## At a Glance

```

{
    // this is a comment
    myKey: {

        key: this is a string
        boolean: true
        number: 123

        list: [
            this is item 1
            this is item 2
        ]
        
        multiline: `
            This is a
            multiline
            string
        `
    }
}

```

## Install

```
  npm install jcon-parser

```

## Usage

```

  let JCON = require('JCON');

  JCON.parseFile('yourFile.jcon', (config)=>{
        console.log(config);
  });
   
  // or...
  
  let config = JCON.parse(jconString);


```



