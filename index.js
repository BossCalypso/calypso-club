import {getFromLocalStorage, Requests} from "./requests.js";

const form = document.getElementById('form-filter');
const filter = form.querySelector('#filter');
const url = form.querySelector('#url')
const submitBtn = form.querySelector('button');


form.addEventListener('submit', submitFormHandler);
// window.addEventListener('load', getFields);
window.addEventListener('load', applyFilter);

function submitFormHandler(event) {
    event.preventDefault();
    submitBtn.disabled = true;
    getFields();
    submitBtn.disabled = false;
}

async function requestToServer(options) {
    const [url, action, params] = options;
    return await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Auth': `${Requests.md5('Valantis')}`
        },
        body: JSON.stringify({
            "action": action,
            "params": params
        }),
    });
}

async function readResponse(response) {

    const reader = response.body.getReader();
    const contentLength = +response.headers.get('Content-Length');
    let receivedLength = 0;
    let chunks = [];

    while (true) {
        const {done, value} = await reader.read();
        if (done) {
            break;
        }
        chunks.push(value);
        receivedLength += value.length;
    }

    let chunksAll = new Uint8Array(receivedLength);
    let position = 0;

    for (let chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
    }

    return JSON.parse(new TextDecoder("utf-8").decode(chunksAll));
}

async function getIds(params) {
    //Async request to server for get ids products
    const response = await requestToServer([url.value, 'get_ids', params]);
    return readResponse(response);
}

async function getItems(params) {
    const ids = await getIds(params);
    //Async request to server for get ids products
    const response = await requestToServer([url.value, 'get_items', {"ids": ids.result}]);
    return await readResponse(response);
}

async function getFields() {
    //Async request to server for get ids products
    const response = await requestToServer([
        url.value,
        'get_fields',
        {"field": filter.value, "offset": 3, "limit": 5}]);
    return await readResponse(response);
}

async function applyFilter() {
    const params = {offset: 0, limit: 50};
    const productsCard = await getItems(params);
    const result = productsCard.result.reduce((o, i) => {
        if (!o.find(v => v.id === i.id)) {
            o.push(i);
        }
        return o;
    }, []);
    console.log(result.length,params.limit)
    if (result.length < 50) {
        let items = await getItems({offset: 50, limit: 1});
        for (let item of items.result) {
            if(!result.find(v =>v.id === item.id)){
                result.push(item);
            }
        }
    }


}

(function navigation() {
    const progress = document.getElementById('progress');
    const prev = document.getElementById('prev');
    const next = document.getElementById('next');
    const circles = document.querySelectorAll('.circle');

    let currentActive = 1;

    next.addEventListener('click', () => {
        currentActive++;
        if (currentActive > circles.length) {
            currentActive = circles.length;
        }
        update();
    });
    prev.addEventListener('click', () => {
        currentActive--;
        if (currentActive < 1) {
            currentActive = 1;
        }
        update();
    })

    function update() {
        circles.forEach((circle, idx) => {
            if (idx < currentActive) {
                circle.classList.add('active');
            } else {
                circle.classList.remove('active');
            }
        });
        const actives = document.querySelectorAll('.circle.active')
        progress.style.width = (actives.length - 1) / (circles.length - 1) * 100 + '%';

        if (currentActive === 1) {
            prev.disabled = true;
        } else if (currentActive === circles.length) {
            next.disabled = true;
        } else {
            prev.disabled = false;
            next.disabled = false;
        }
    }
})()



