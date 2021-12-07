const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const async = require('async');

const port = 3000;
const filePath = 'D:\\code/mine/crawler/node/umi-myapp/package-lock.json';

app.get('/', async (req, res) => {
  await init(filePath);
  res.send('Hello World!');
});

// 获取插件名单列表并且处理成json文件查看
const init = async(packagePath) => {
  try {
    // 获取插件名单
    const data = fs.readFileSync(packagePath);
    const { dependencies } = JSON.parse(data);
    const dependList = Object.keys(dependencies);
    // const downLoadFileObj = [];
    const savePath = "./downloads";
    // const testList = dependList.slice(0, 20);
    const resultArr = await multiRequest(dependList, 5);
    // const downLoadFileObj = resultArr.map((result, index) => {
    //   return {
    //     "name": dependList[index],
    //     "downloads": result
    //   }
    // })
    // async.mapLimit(dependList.slice(0, 10), 5, (package) => {
    //   console.log('name ====>>>', package);
    //   setTimeout(async() => {
    //     console.log('package name ====>>>', package);
    //     const downloads = await getDownloads(package);
    //     const item = {
    //       "name": package,
    //       "downloads": downloads
    //     }
    //     downLoadFileObj.push(item);
    //   }, 500)
    // })
     // 保存称本地json文件
    //  console.log('获取得对象---', resultArr);
    if(isFileExisted(savePath)) {
      console.log('====文件存在====',savePath+'/data.json');
      fs.writeFileSync(savePath+'/data.json', JSON.stringify(resultArr), (err) => {
        if(err) throw err;
        console.log('====写入完成====');
      })
    }
  } catch (error) {
    console.log('init 程序报错'+error);
  }
}

/**
 * 限制并发
 * @params list { array } 请求队列
 * @params maxRequest { number } 最大请求量
 */
async function multiRequest(list, maxRequest) {
  const len = list.length;
  const result = new Array(len).fill(false);
  let count = 0;

  return new Promise((resolve, reject) => {
    while(count < maxRequest) {
      next();
    }

    function next() {
      let current = count++;
      // 边界情况
      if(current >= len) {
        // 请求全部完成就将promise置为成功状态, 然后将result作为promise值返回
        !result.includes(false) && resolve(result);
        return;
      }
      const package = list[current];
      getDownloads(package).then((res) => {
        // 保存请求结果
        result[current] = {
              "name": package,
              "downloads": res
        };
        console.log('获取得对象---', result[current]);
        // 请求没有全部完成, 就递归
        if (current < len) {
          // 延时操作
          setTimeout(() => {
            next();
          }, 3000);
        }
      })
      .catch((err) => {
        result[current] = err;
        // 请求没有全部完成, 就递归
        if (current < len) {
          // 延时操作
          setTimeout(() => {
            next();
          }, 2000);
        }
      });
    }
  })
}

// 判断文件是否存在，不存在则创建
const isFileExisted = async(pathWay) => {
  try {
    if(fs.existsSync(pathWay)) {
      return true;
    }
    if(isFileExisted(path.dirname(pathWay))) {
      fs.mkdirSync(pathWay);
      return true;
    }
    return false;
  } catch (error) {
    console.log('创建文件报错了' + error)
    return false;
  }
}

// 获取包下载量
const getDownloads = async(packageName) => {
  const browser = await puppeteer.launch({
    headless: false,
  });
  try {
    const page = await browser.newPage();
    await page.goto(`https://www.npmjs.com/package/${packageName}`);
    // npm 官网下载量的classname， 如果官网改变了需要对应改变
    const downloadsClassName = '._9ba9a726'
    const downloads = await page.$eval(downloadsClassName, (el) => el.textContent);
    await browser.close();
    console.log('获取到的下载量===》'+downloads);
    return downloads;
  } catch (error) {
    console.log(`访问${packageName}页面报错了,报错信息====>>>> ${error}`);
    await browser.close();
    return 0;
  }
}

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
})