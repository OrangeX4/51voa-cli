#!/usr/bin/env node
'use strict'
const request = require('request')
const cheerio = require('cheerio')
const mkdirp = require('mkdirp')
const co = require('co')
const fs = require('fs')
const join = require('path').join
const dirname = require('path').dirname
const resolve = require('url').resolve

const dir = process.argv[2] || process.cwd()

// eg. VOA《常速英语 Standard English》听力下载 - 美国之音
const listUrl = process.argv[3] || 'http://www.51voa.com/VOA_Standard_1.html'

co(run)
  .catch((err) => {
    console.error(err.stack)
  })

function* run() {
  console.log(`fetching... ${listUrl}`)
  const html = yield fetch(listUrl)

  const links = []
  const $ = cheerio.load(html)
  const $lis = $('#list a')
  $lis.each((i, el) => {
    const title = $(el).text()
    const url = $(el).attr('href')
    links.push({ title, url })
  })
  const len = links.length
  console.log(`${len} links fetched`)
  var AllText = ''
  for (let i = 0; i < len; i++) {
    const link = links[i]
    // console.log(`fetching... ${i}/${len} - ${link.title}`)
    let detailUrl = resolve(listUrl, link.url)
    try {
      const html = yield fetch(detailUrl)

      // eg. Player("/201604/fusion-reactor-still-in-works.mp3");
      const audioPath = html.match(/Player\("(.+?)"\);/)[1]
        .substr(1) // removing leading `/`
      const dest = join(dir, audioPath)

      // eg. http://downdb.51voa.com/201604/fusion-reactor-still-in-works.mp3
      const audioUrl = `http://downdb.51voa.com/${audioPath}`
      console.log(`downloading... ${i}/${len} - ${link.title}`)
      // console.log(delHtmlTag(getMidString(html,'<div id="content">','</div>')))
      yield download(audioUrl, dest)
      var pre ='***' + audioPath + '***\n' + getVoaText(html)
      saveTextFile(dest,pre)
      AllText += pre + '\n\n\n'

    } catch (err) {
      console.error(err)
    }
    saveTextFile(`${dir}/AllText`,AllText)
  }

  console.log(`${len} files saved`)
}

function* download(url, dest) {
  return yield (done) => {
    if (fs.existsSync(dest)) return done() // skipping
    mkdirp.sync(dirname(dest))
    const writer = fs.createWriteStream(dest)
    writer.on('error', (err) => { done(err) })
    writer.on('finish', () => { done() })
    request(url).pipe(writer)
  }
}

function* fetch(url) {
  return yield (done) => {
    request(url, (err, res, html) => {
      done(err, html)
    })
  }
}

function getMidString(text, start, end) {
  var startIndex, endIndex
  startIndex = text.indexOf(start, 0) + start.length
  endIndex = text.indexOf(end, startIndex)
  return text.slice(startIndex, endIndex)
}

function delHtmlTag(str) {
  return str.replace(/<[^>]+>/g, "");//去掉所有的html标记
}

function getVoaText(htmltext) {
  return delHtmlTag(getMidString(htmltext,'<div id="content">','</div>'));
}
function saveTextFile(dir,data){
  // 创建一个可以写入的流，写入到文件 .txt 中
  var writerStream = fs.createWriteStream(`${dir}.txt`);
  // 使用 utf8 编码写入数据
  writerStream.write(data, 'UTF8');
  // 标记文件末尾
  writerStream.end();
  // 处理流事件 --> data, end, and error
  // writerStream.on('finish', function () {
  //   console.log("写入完成。");
  // });
  writerStream.on('error', function (err) {
    console.log(err.stack);
  });
  // console.log("程序执行完毕");
}