'use strict';

exports.convertTemplates = convertTemplates;
/**
 * Takes a string and converts all the template strings occurring in it
 * @param {String} str
 * @returns {String} str
 **/
function convertTemplates(str) {
  var n = 0;
  var loc = 0;
  var templateLocations = { open: [], close: [] };
  var strings;
  var templObj

  // find the templates
  // opening braces
  while (str.indexOf('{{', n) !== -1) {
    loc = str.indexOf('{{', n);
    templateLocations.open.push(loc);
    n = loc + 1;
  }

  n = 0;
  loc = 0;

  // closing braces
  while (str.indexOf('}}', n) !== -1) {
    loc = str.indexOf('}}', n);
    templateLocations.close.push(loc);
    n = loc + 2;
  }

  templObj = { source: [], toChange: [] };

  // identify the template strings
  templObj.source = templateLocations.close.map(function findPairs(close) {
    var lastOpen = Math.max.apply(null, templateLocations.open.filter(function findLessThanClose(e) {
      return e < close;
    }));
    var lastOpenIndex = templateLocations.open.indexOf(lastOpen);
    templateLocations.open.splice(lastOpenIndex, 1);

    return str.slice(lastOpen, close + 2);
  });

  // make sure there is only one string to replace for nested templates
  // templObj.source.forEach(function makeStringsToChange(templ, ind, arr) {
  //   var i = 1;
  //   var nestedTempl;
  //   while (templ.match(/\{\{/g).length > 1) {
  //     nestedTempl = a[ind + i++];
  //     arr.splice(ind, 1);
  //   }
  // })

  // change the order in the object to make sure the inner nested templates are handled first
  var rememberStack = [];
  // templObj.toChange = templObj.source.slice().reverse();
  templObj.source.reverse().forEach(function changeOrder(templ, i, a) {
    if (a[i+1] && templ.indexOf(a[i+1]) !== -1) {
      rememberStack.push(templ);
    } else {
      templObj.toChange.push(templ);
      while (rememberStack.length !== 0) {
        templObj.toChange.push(rememberStack.pop());
      }
    }
  });
  // now convert the strings, doesn't matter if they are inline or multiline

  templObj.toChange.reverse().forEach(function convertTemplates(templ) {
    console.log(templ);
    str = str.replace(templ, replaceSingleTemplate(templ));
    // newWikitext = newWikitext.slice(0, newWikitext.indexOf(str.slice(0, str.indexOf('|')) + replaceSingleTemplate(str) + newWikitext.slice(newWikitext.indexOf(str) + str.length);
  });

  return str;
}

/**
 * Converts wikitext into markdown optimized for later conversion to troff
 * If you want the original markdown/html, call the api with parse action.
 * @param {String} wikitext
 * @param {String} markdown
 **/
exports.convertWikitext = function wiki2md(wikitext) {

  var tempArrayA;
  var tempArrayB;
  var newWikitext;

  newWikitext = convertTemplates(wikitext);

  // do all the inline replacements
  tempArrayA = newWikitext.split('\n').map(function replaceLine(line) {
    return inlineReplaceAll(line);
  });

  tempArrayB = [];

  tempArrayA.forEach(function multiLineAfter(line, ind, a) {
    var prev = a[ind - 1] ? a[ind - 1][0] : null;
    var current = line[0];

    // fix tables too
    if (/^\|\-|^\{\||^\|\}/.test(line)) {
      // don't push to the other array
    } else if (/[\+1]/.test(line.trim()[0])) {
    // make sure to leave indented lists alone
      tempArrayB.push(line);
    } else if (prev !== ' ' && current !== ' ') {
      tempArrayB.push(line);
    } else if (prev !== ' ' && current === ' ') {
      tempArrayB.push('\n```');
      tempArrayB.push(line.substr(1));
    } else if (prev === ' ' && current === ' ') {
      tempArrayB.push(line.substr(1));
    } else {
      tempArrayB.push('```\n');
      tempArrayB.push(line);
    }
  });

  return tempArrayB.join('\n');

};

/**
 * Converts a single template string
 * @param {String} str
 * @returns {String} str
 **/
function replaceSingleTemplate(str) {
  return str
    // Related
    .replace(/^\{\{Related articles.+\}\}$/, '')
    .replace(/^\{\{Related\|.+\}\}$/, '')
    // Broken packages
    .replace(/^\{\{(Broken.+?)\|(.+)\}\}$/, '')
    .replace(/^\{\{(aur-mirror)\|(.+)\}\}$/, '')
    // inline code
    .replace(/^\{\{ic\|(.+?)\}\}$/g, '`$1`')

    // block code with header
    .replace(/^\{\{hc\|(.+?)\|(.+?)\}\}$/g, '```\n$1\n$2\n```')

    // block code without header
    .replace(/^\{\{bc\|(.+?)\}\}$/g, '```\n$1\n```')

    // aur, pkg and everything else
    .replace(/^\{{2}(.+?)\|(.+?)\}{2}$/g, function replaceTemplates(re, templ, text) {
      return (/AUR|PKG|GRP/i.test(templ)) ? "''" + text + "'' (" + templ + ")'" : "''" + templ + "'': '" + text + "'"; // eslint-disable-line quotes
    });
}
/**
 * All inline regex replaces
 * @param {String} str
 * @returns {String} str
 **/
function inlineReplaceAll(str) {

  return str

    // line breaks
    .replace(/^[\-\*\_]{3}.*$/, '----')

    // get rid of files and images
    .replace(/\[\[(file|img):((ht|f)tp(s?):\/\/(.+?))( (.+))*\]\]/, '')

    // lists
    .replace(/^([\*#]*){1,8}/, function replaceLists(re, matches) {
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
    .replace(/^; ([^:]+?)\: (.*)/, '**$1**\n  $2')
    .replace(/^; (.*)/, '**$1**')
    .replace(/^: (.*)/, '  $1')

    // colon-indentation
    .replace(/^(:+)(\w)/, function replaceColonIndentation(re, level, text) {
      return level.replace(/:/g, '  ') + text;
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
}
