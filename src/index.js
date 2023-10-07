process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const config = (ctx) => {
    let userConfig = ctx.getConfig('picBed.postimage')
    if (!userConfig) {
        userConfig = {}
    }
    const config = [
        {
            name: 'api_key',
            type: 'input',
            alias: 'API Key',
            default: userConfig.api_key || '',
            message: 'API Key不能为空',
            required: true
        },
        {
            name: 'gallery',
            type: 'input',
            alias: '图片分类',
            default: userConfig.gallery || '',
            message: '例如：screeShot',
            required: true
        }
    ]
    return config
}


/**
 * 构造图片上传请求
 * @param {插件配置} userConfig 
 * @param {图片名称} fileName 
 * @param {图片拓展名（不含‘.’）} extname 
 * @param {图片源数据} img 
 * @returns 图片上传请求
 */
const imageUploadRequestConstruct = (userConfig, fileName, img) => {
    var formObject = {
        'key' : userConfig.api_key,
        'gallery': userConfig.gallery,
        'o': '2b819584285c102318568238c7d4a4c7',
        'm': '59c2ad4b46b0c1e12d5703302bff0120',
        'version': '1.0.1',
        'portable':'1',
        'name': fileName.split('.')[0],
        'type': fileName.split('.')[1],
        'image': img
    }
    var formBody = []
    for (var property in formObject) {
        var encodedKey = encodeURIComponent(property);
        var encodedValue = encodeURIComponent(formObject[property]);
        formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&")

    return {
        method: 'POST',
        url: 'http://api.postimage.org/1/upload',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: formBody
    }
}


/**
 * 构造源图片下载链接请求
 * @param {*} page 
 * @returns 
 */
const getDownloadUrlRequestConstruct = (page) => {
    return {
        'method': 'GET',
        'url': page,
        'headers': {
            'User-Agent': 'PostmanRuntime/7.29.0'
        }
    }
}


const handle = async (ctx) => {
    const userConfig = ctx.getConfig('picBed.postimage')
    if(!userConfig){
        throw new Error('请配置API KEY！')
    }       

    const imgList = ctx.output
    for(var i in imgList) {
        let img = imgList[i].base64Image
        if(!img && imgList[i].buffer){
            img = imgList[i].buffer.toString('base64')
        }

        // 上传图片
        await ctx.request(imageUploadRequestConstruct(userConfig, imgList[i].fileName, img)).then(async (imageUploadResponse) => {
            // 解析 xml 中的管理页面地址
            // 此处 imageUploadResponse 可解析出缩略图链接、压缩图像链接
            var page = imageUploadResponse.match(new RegExp('<page>http://postimg.cc/\\\w*</page>'))[0].slice(6, -7)
            await ctx.request(getDownloadUrlRequestConstruct(page)).then((getDownloadUrlResponse) => {
                // 解析图片下载地址
                var url = getDownloadUrlResponse.match(new RegExp('https://i.postimg.cc/\\\w{8}/.*\?dl=1'))[0]
                if(!url){
                    ctx.log.error('[Postimage] 解析下载地址失败')
                }
                else{
                    imgList[i]['imgUrl'] = url

                    delete imgList[i].base64Image
                    delete imgList[i].buffer
                }
            }).catch((error) => {
                ctx.log.error(`[Postimage] 解析下载地址失败，${error.message}`)
            })
        }).catch((error) => {
            ctx.log.error(`[Postimage] 图片上传失败，${error.message}`)
        })
    }
    return ctx
}


module.exports = (ctx) => {
    const register = () => {
        ctx.log.success('postimage加载成功！')
        ctx.helper.uploader.register('postimage', {
            handle: handle,
            config: config,
            name: 'postimage'
        })
    }
    return {
        register,
        uploader: 'postimage'
    }
}