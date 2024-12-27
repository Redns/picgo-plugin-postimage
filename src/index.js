const config = (ctx) => {
    let userConfig = ctx.getConfig('picBed.postimage') || {};
    return [
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
    ];
};

/**
 * 构造图片上传请求
 * @param {插件配置} userConfig 
 * @param {图片名称} fileName 
 * @param {图片源数据} img 
 * @returns 图片上传请求
 */
const imageUploadRequestConstruct = (userConfig, fileName, img) => {
    const formObject = {
        key: userConfig.api_key,
        gallery: userConfig.gallery,
        o: '2b819584285c102318568238c7d4a4c7',
        m: '59c2ad4b46b0c1e12d5703302bff0120',
        version: '1.0.1',
        portable: '1',
        name: fileName.split('.')[0],
        type: fileName.split('.')[1],
        image: img
    };

    const formBody = Object.keys(formObject)
        .map(property => `${encodeURIComponent(property)}=${encodeURIComponent(formObject[property])}`)
        .join("&");

    return {
        method: 'POST',
        url: 'https://api.postimage.org/1/upload',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: formBody
    };
};

/**
 * 构造源图片下载链接请求
 * @param {*} page 
 * @returns 
 */
const getDownloadUrlRequestConstruct = (page) => {
    return {
        method: 'GET',
        url: page,
        headers: {
            'User-Agent': 'PostmanRuntime/7.29.0'
        }
    };
};

const handle = async (ctx) => {
    const userConfig = ctx.getConfig('picBed.postimage');
    if (!userConfig) {
        throw new Error('请配置API KEY！');
    }

    const imgList = ctx.output;

    for (const imgData of imgList) {
        let img = imgData.base64Image || (imgData.buffer && imgData.buffer.toString('base64'));
        if (!img) continue;

        try {
            const imageUploadResponse = await ctx.Request.request(imageUploadRequestConstruct(userConfig, imgData.fileName, img));
            const page = imageUploadResponse.match(/<page>(https:\/\/postimg\.cc\/\w*)<\/page>/)[1];

            const getDownloadUrlResponse = await ctx.Request.request(getDownloadUrlRequestConstruct(page));
            const url = getDownloadUrlResponse.match(/(https:\/\/i\.postimg\.cc\/\w{8}\/.*\?dl=1)/)[0];

            if (!url) {
                ctx.log.error('[Postimage] 解析下载地址失败');
            } else {
                imgData.imgUrl = url;
                delete imgData.base64Image;
                delete imgData.buffer;
            }
        } catch (error) {
            ctx.log.error(`[Postimage] 处理图片失败，${error.message}`);
        }
    }

    return ctx;
};

module.exports = (ctx) => {
    const register = () => {
        ctx.helper.uploader.register('postimage', {
            handle: handle,
            config: config,
            name: 'postimage'
        });
    };
    return {
        register,
        uploader: 'postimage'
    };
};
