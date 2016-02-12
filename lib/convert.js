'use strict';

/**
 * Converts wikitext into markdown optimized for later conversion to troff
 * If you want the original markdown/html, call the api with parse action.
 * @param {String} wikitext
 * @param {String} markdown
 **/
exports.convert = function wiki2md(wikitext) {
  var replacedArray = wikitext.split('\n').map(function replaceLine(line) {
    return line
        // lists
      .replace(/^([\*#]*){1,8}/, function replacelists(re, matches) {
        var len = matches.length;
        if (len === 1) {
          return (matches[0] === '*') ? '+' : '1.';
        } else {
          return matches.split('').map(function makeList(c, i) {
            if (i === len - 1) {
              return (c === '*') ? '+' : '1.';
            } else {
              return '  ';
            }
          }).join('');
        }
      })
        // section links become em text
      .replace(/\[\[(.*?)#(.*?)\]\]/g, function replaceSectionLinks(re, match1, match2) {
        return /\|/.test(match2) ? match2.replace(/(.*?)\|(.*)/, '**$2**') : '**' + match2 + '**';
      })
        // piped links become strong text with just the pipe
      .replace(/\[\[(.*?)\|(.*?)\]\]/g, '**$2**')
        // regular links become strong text
      .replace(/\[\[(.*?)\]\]/g, '**$1**')
        // named website links
      .replace(/\[(http[^ \]]*) ([^\]]*)\]/g, '**$2** (*$1*)')
        // plain links
      .replace(/(.?)(http[^ \b\n]+) ?\b(\])?/, function replacePlainLinks(re, precedingChar, url) {
        return (precedingChar === '*') ? re : '*' + url + '*';
      })
        // strikethrough
      .replace(/<\/?s>/g, '~~')
        // underline becomes emphasis
      .replace(/<\/?u>/g, '_')
        // hidden text goes away
      .replace(/<!--.*-->/g, '')
        // strong & emphasis
      .replace(/'{5}(.*?)'{5}/g, '**_$1_**')
        // strong
      .replace(/'{3}(.*?)'{3}/g, '**$1**')
        // emphasis
      .replace(/'{2}(.*?)'{2}/g, '*$1*')
        // headers
      .replace(/^(={2,6})(.*)\1/g, function replaceHeaders(re, level, text) {
        return level.replace(/=/g, '#') + ' ' + text.trim();
      })
        // definition lists
      .replace(/^; ([^:]+?)\: (.*)/, '**$1**\n\t$2')
      .replace(/^; (.*)/, '**$1**')
      .replace(/^: (.*)/, '\t$1')
        // inline code
      .replace(/\{\{ic\|(.*?)\}\}/g, '`$1`')
        // block code with header
      .replace(/\{\{hc\|(.*?)\|(.*?)\}\}/g, '```\n$1\n$2\n```')
        // block code without header
      .replace(/\{\{bc\|(.*?)\}\}/g, '```\n$1\n```')
        // colon-indentation
      .replace(/^(:+)(\w)/, function replaceColonIndentation(re, level, text) {
        return level.replace(/:/g, '\t') + text;
      })
        // {{templates}}
        // TODO: allow for templates elsewhere in the string and nested
      .replace(/^\{{2}(.*?)\|(.*?)\}{2}/g, function replaceTemplates(re, templ, text) {
        return (/AUR|PKG/i.test(templ)) ? '**' + text + '** (*' + templ + '*)' : '**' + templ + '**: *' + text + '*';
      })
        // tables
      .replace(/^\{\|.*/, '')
      .replace(/^\|\+ (.*)/, '**_$1_**')
      .replace(/^! (.*)/, function replaceTableHeaders(re, headers) {
        var count = headers.split('!!').length;
        var dd = '---';
        var i;
        for (i = 1; i < count; i++) {
          dd = dd + ' | ---';
        }
        return headers.replace(/!!/g, '|') + '\n' + dd;
      })
      .replace(/^\| (.*)/, function replaceTableContents(re, contents) {
        return contents.replace(/\|\|/g, '|');
      })
      .replace(/^\|\}/, '');
  });
  var newArray = [];

  replacedArray.forEach(function buildCodeBlocks(line, i, a) {
    var prev = a[i - 1] ? a[i - 1][0] : null;
    var cur = line[0];

    // fix tables too
    if (/^\|\-|^\{\||^\|\}/.test(line)) {
      // don't push to the other array
    } else if (/[\+1]/.test(line.trim()[0])) {
    // make sure to leave indented lists alone
      newArray.push(line);
    } else if (prev !== ' ' && cur !== ' ') {
      newArray.push(line);
    } else if (prev !== ' ' && cur === ' ') {
      newArray.push('\n```');
      newArray.push(line.substr(1));
    } else if (prev === ' ' && cur === ' ') {
      newArray.push(line.substr(1));
    } else {
      newArray.push('```\n');
      newArray.push(line);
    }
  });

  return newArray.join('\n');
};
