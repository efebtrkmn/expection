"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IyzicoSignatureUtil = void 0;
const crypto = require("crypto");
class IyzicoSignatureUtil {
    static buildAuthorizationHeader(apiKey, secretKey, requestBody) {
        const randomString = Math.floor(Math.random() * 1000000).toString();
        const hashStr = apiKey + randomString + secretKey + requestBody;
        const hash = crypto.createHmac('sha256', secretKey).update(hashStr).digest('base64');
        return `IYZWS ${apiKey}:${hash}`;
    }
    static verifyCallbackSignature(token, secretKey, expectedSignature) {
        if (!secretKey || !expectedSignature)
            return false;
        const hash = crypto.createHash('sha1').update(`${secretKey}${token}`).digest('hex');
        return hash === expectedSignature;
    }
    static timestamp() {
        return new Date().toISOString().replace('T', ' ').substring(0, 19);
    }
}
exports.IyzicoSignatureUtil = IyzicoSignatureUtil;
//# sourceMappingURL=iyzico-signature.util.js.map