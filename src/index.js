const config = (ctx) => {
    let userConfig = ctx.getConfig('picBed.postimage-uploader')
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


const handle = async (ctx) => {
    // 获取用户配置信息
    const userConfig = ctx.getConfig('picBed.postimage-uploader')
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
    
    try{
        const imgList = ctx.output
        for(var i in imgList) {
            let img = imgList[i].base64Image
            if(!img && imgList[i].buffer){
                img = imgList[i].buffer.toString('base64')
            }

            // 构建POST请求
            const request = requestConstruct(userConfig, imgList[i].fileName, imgList[i].extname, img)

            // 发起POST请求
            const response = await ctx.Request.request(request)
            ctx.log.success('[ResponseCode]' + response.statusCode)
            if((response.statusCode == 200) || (response.statusCode == 201)){
                delete imgList[i].base64Image
                delete imgList[i].buffer
                const url = `http://${imgList[i].fileName}.${imgList[i].extname}`
                imgList[i]['imgUrl'] = url
            }
            else{
                throw new Error('Upload failed')
            }
        }
        return ctx
    }
    catch(err){
        if (err.error === 'Upload failed') {
            ctx.emit('notification', {
                title: '上传失败！',
                body: '请检查你的配置项是否正确'
            })
        } 
        else {
            ctx.emit('notification', {
                title: '上传失败！',
                body: '请检查你的配置项是否正确'
            })
        }
        throw err
    }
}


module.exports = (ctx) => {
    const register = () => {
        ctx.log.success('postimage加载成功！')
        ctx.helper.uploader.register('postimage-uploader', {
            handle: handle,
            config: config,
            name: 'postimage'
        })
    }
    return {
        register,
        uploader: 'postimage-uploader'
    }
}