const query = require('./pool'),
    Koa = require('koa'),
    router = require('koa-router')(),
    bodyParser = require('koa-bodyparser'),
    koaBody = require('koa-body'),
    Multiparty = require('multiparty'),
    ffmpegInstaller = require('@ffmpeg-installer/ffmpeg'),
    ffmpeg = require('fluent-ffmpeg'),
    AipSpeechServer = require('baidu-aip-sdk').speech;

    ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const APP_ID = "16815350";
const API_KEY = "eIbDqc5uNcuy2CTOawvOcDW3";
const SECRET_KEY = "inDprtR5BSE9bIZ9P1dXVxwHE8o5wheT";
const client = new AipSpeechServer(APP_ID, API_KEY, SECRET_KEY);
const app = new Koa()

router.post('/recognition', function (ctx, next) {
    let res = ctx.res;
    let req = ctx.req;
    //生成multiparty对象，并配置上传目标路径
    var form = new Multiparty.Form({ uploadDir: './public/audio' });
    //上传完成后处理
    form.parse(req, function (err, fields, files) {
        var filesTemp = JSON.stringify(files, null, 2);
        console.log("测试1")
        if (err) {
            console.log(err)
            ctx.body = { status: -1, msg: '', data: '未知错误' };
        } else {
            console.log("测试3")
            var inputFile = files.file[0];
            
            var uploadedPath = inputFile.path;
            var command = ffmpeg();
            command.addInput(uploadedPath)
                //.saveToFile('./public/audio/222.wav')//保存编码文件到文件夹 --保存成wav是可以的，但是pcm报错
                .saveToFile('./public/audio/16k.wav')
                .on('error', function (err) {
                    console.log(err)
                })
                .on('end', function () {
                    //调用百度语音合成接口
                    var voice = fs.readFileSync('./public/audio/16k.wav');
                    var voiceBuffer = new Buffer(voice);
                    client.recognize(voiceBuffer, 'wav', 16000).then(function (result) {
                        //console.log(result);
                        var data = [];
                        if (result.err_no === 0) {
                            data = result.result;
                        }
                        ctx.body = { status: 200, msg: '', data: data };
                    }, function (err) {
                        console.log(err);
                    });
                    //语音识别 end

                    //删除上传的临时音频文件
                    fs.unlink(uploadedPath, function (err) {
                        if (err) {
                            console.log(uploadedPath + '文件删除失败');
                            console.log(err);
                        } else {
                            console.log(uploadedPath + '文件删除成功');
                        }
                    });
                    //删除mp3转成wav格式的音频
                    fs.unlink('./public/audio/16k.wav', function (err) {
                        if (err) {
                            console.log('16k.wav文件删除失败');
                            console.log(err);
                        } else {
                            console.log('16k.wav文件删除成功');
                        }
                    });
                });
        }
    });
});


router.post('/garbage/list', async (ctx) => {
    let params = ctx.request.body;
    let res = [];
    if (params.keyword) {
        let selectStr = `select a.id as id, a.name as name,a.sort_id, b.name as type_name, b.desc as sort_desc from product as a, sort as b where a.sort_id = b.id and a.name like ?`;
        res = await query(selectStr, [`%${params.keyword}%`])
    }
    else {
        res = await query(`select * from garbage`)
    }
    ctx.response.body = { status: 200, msg: '', data: res };
})

router.post('/garbage/desc', async (ctx) => {
    let params = ctx.request.body;
    let res = [];
    if (params.name) {
        let selectStr = `select * from sort where name = ?`;
        res = await query(selectStr, [params.name])
    }
    else {
        res = await query(`select * from sort`)
    }
    ctx.response.body = { status: 200, msg: '', data: res ? res[0] : {} };
})

// app.use(bodyParser());
app.use(koaBody({
  multipart: true, // 支持文件上传
  formidable: {
    maxFieldsSize: 2 * 1024 * 1024, // 最大文件为2兆
    multipart: true // 是否支持 multipart-formdate 的表单
  }
}));

app.use(router.routes());

app.use(router.allowedMethods());

app.listen(3003, () => {
    console.log('\033[42;37m SUCCESS \033[42;37m 服务端启动成功,localhost:3003\033[0m')
});
