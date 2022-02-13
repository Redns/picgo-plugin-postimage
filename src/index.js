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


const requestConstruct = (userConfig, fileName, extname, img) => {
    const api_key = userConfig.api_key
    const gallery = userConfig.gallery
    var formObject = {
        'key' : api_key,
        'gallery': gallery,
        'o': '2b819584285c102318568238c7d4a4c7',
        'm': '59c2ad4b46b0c1e12d5703302bff0120',
        'version': '1.0.1',
        'name': fileName.split('.')[0],
        'type': extname.slice(1),
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


const getDownloadUrlConstruct = (page) => {
    return {
        'method': 'GET',
        'url': page,
        'headers': {
            'User-Agent': 'PostmanRuntime/7.29.0'
        }
    }
}


const handle = async (ctx) => {
    // 获取用户配置信息
    const userConfig = ctx.getConfig('picBed.postimage')
    if(!userConfig){
        throw new Error('请配置API KEY！')
    }       

    var responseObject = {
        image: {
            name: '',
            time: '',
            type: '',
            width: '',
            height: '',
            size: ''
        },
        links: {
            page: '',
            edit: '',
            delete: '',
            thumbnail: '',
            hotlink: ''
        },
        codes: {
            thumbnail_forum: '',
            thumbnail_html: '',
            hotlink_forum: '',
            hotlink_html: ''
        }
    }
    

    const imgList = ctx.output
    for(var i in imgList) {
        let img = imgList[i].base64Image
        if(!img && imgList[i].buffer){
            img = imgList[i].buffer.toString('base64')
        }

        try{
            // 格式化图片名称
            var myDate = new Date()
            var fileName = `${myDate.getFullYear()}${myDate.getMonth() + 1}${myDate.getDate()}${myDate.getHours()}${myDate.getMinutes()}${myDate.getSeconds()}`

            // 上传图片
            const request = requestConstruct(userConfig, fileName + imgList[i].extname, imgList[i].extname, img)
            const response = await ctx.Request.request(request)

            // 解析xml中的page地址
            var regexPage = new RegExp('<page>http://postimg.cc/\\\w*</page>')
            var page = response.toString().match(regexPage)[0].slice(6, -7)
            if(page){
                // 获取下载地址
                const getDownloadUrlRequest = getDownloadUrlConstruct(page)
                const getDownloadUrlResponse = await ctx.Request.request(getDownloadUrlRequest)

                // 解析下载地址
                var v = fileName + imgList[i].extname
                var regexDownloadUrl = new RegExp('https://i.postimg.cc/\\\w{8}/' + v + '\\?dl=1')
                var url = getDownloadUrlResponse.toString().match(regexDownloadUrl)[0]
                if((url == undefined) || (url == null)){
                    ctx.log.info('解析下载地址失败, 请检查API Key是否过期')
                }
                else{
                    // 装载下载地址
                    delete imgList[i].base64Image
                    delete imgList[i].buffer
                    imgList[i]['imgUrl'] = url
                    ctx.log.info(url)
                }
            }
            else{
                ctx.log.error('图片上传失败, 原因可能是图片尺寸超出限制、网络状态不佳……')
            }
        }
        catch(err){
            ctx.log.info('文件上传失败, 请检查API Key是否过期、网络状态是否良好')
        }
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