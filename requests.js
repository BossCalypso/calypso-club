import {CryptoJS} from "./utils.js";

export class Requests {

    static md5(pass) {
        const date = new Date().toLocaleDateString('ru-RU')
            .replaceAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g, '$3$2$1');
        return CryptoJS.MD5(pass + '_' + date).toString();
    }
}

function addToLocalStorage(ids) {
    const productsId = getFromLocalStorage()
    if (typeof productsId === 'string') {
        JSON.parse(productsId)
    }
    for (let id of ids.result) {
        if (!productsId.find(item => item === id)) {
            productsId.push(id)
        }
    }
    localStorage.setItem('productsID', JSON.stringify(productsId))
    return productsId
}

export function getFromLocalStorage() {
    return JSON.parse(localStorage.getItem('productsID') || '[]')
}

