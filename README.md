# wikitext2markdown

**Note** I ended up going through html anyway because making this parser turned out to be more complicated than I thought. Right now the regular expressions are picking up just about everything in wikitext, but there are some issues with my replacement strings (too many `*`'s causing problems) and with correctly replacing the template tags. I'm keeping this up to maybe come back to it later on because it _would_ be nice to have this..

Converts wikitext into markdown without going through html. I wrote this to get a very lightweight way to get wikitext (mediawiki format) into a modified form of markdown for later display on the command line.

There are still some issues with this but it works passably well for now.

Note that I wrote this for my own purposes and I am actually stripping a bunch of content that isn't relevant for me, such as links. If you are looking for a more complete converter, you should get the content from the wiki in html and parse it as markdown instead - or convert the wikitext to html and the html to markdown.

## Install

```
npm install wikitext2markdown
```

## Usage

```
var wiki2md = require('wikitext2markdown');

wiki2md('== header ==');    // ## header
wiki2md('{{Tip|foo bar}}'); // **Tip**: *foo*
```

For more examples, check the tests

## Todo

+ multiline code in the bc template format (`{{bc|code}}`)
+ fix tables with template links in them
