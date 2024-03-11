import {getFromLocalStorage, Requests} from "./requests.js";

const form = document.getElementById('form-filter');
const filter = form.querySelector('#filter');
const url = form.querySelector('#url')
const submitBtn = form.querySelector('button');

filter.addEventListener('change', getFields)
form.addEventListener('submit', submitFormHandler);
// window.addEventListener('load', renderCard(0));

submitBtn.disabled = true;

function submitFormHandler(event) {
    event.preventDefault();
    getFields(event);
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

    if (response.statusText !== 'OK') {
        await getIds(params);
        console.log(response.statusText);
    }
    return readResponse(response);
}

async function getItems(params) {
    const ids = await getIds(params);
    //Async request to server for get items products
    const response = await requestToServer([
        url.value,
        'get_items',
        {"ids": ids.result}
    ]);

    if (response.statusText !== 'OK') {
        await getItems(params);
        console.log(response.statusText);
    }
    return await readResponse(response);
}

async function filterProducts(options) {
    const [result, params, event] = options;
    let output = [];
    if (Object.keys(result).length) {
        const nameItem = result.result.reduce((a, i) => {
            if (!a.find(v => v === i)) {
                a.push(i)
            }
            return a;
        }, []);

        nameItem.forEach(i => {
            output.push(`<option value= '${i}'>${i}</option>`);
        });
    } else {

    }
    submitBtn.disabled = false;
    let defText = '';
    switch (event.target.value) {
        case 'product':
            defText = 'Выберите название товара из списка';
            break;
        case 'price':
            defText = 'Выберите стоимость товара';
            break;
        case 'brand':
            defText = 'Выберите Бренд товара';
            break;
    }
    if (filter.value === 'no-filters') {
        form.querySelector('#inner-filter').innerHTML = ''
        form.querySelector('#inner-filter').style.display = 'none';
    } else {
        form.querySelector('#inner-filter').innerHTML = ` 
                     <select id="inner-filter-select" class="mui-dropdown">
                             <option value= 'null' selected>${defText}:</option> 
                            ${output.join('')}  
                    </select>                                            
        `;
        form.querySelector('#inner-filter').style.display = 'block';
    }

    const innerForm = document.getElementById('inner-filter-select')
        .addEventListener('change', (e) => {
            const name = event.target.value;
            const params = {
                [name]: e.target.value
            };
            console.log(result, params, event)
        });


}

async function getFields(e) {
    //Async request to server for get fields products
    const response = await requestToServer([
        url.value,
        'get_fields'
    ]);
    if (response.statusText !== 'OK') {
        await getFields(e);
        console.log(response.statusText);
    }

    const fields = await readResponse(response);

    switch (filter.value) {
        case fields.result.find(i => i === filter.value):
            //Async request to server for get fields products
            const response = await requestToServer([
                url.value,
                'get_fields',
                {"field": filter.value, "offset": 0, "limit": 50}]);

            if (response.statusText !== 'OK') {
                await getFields(e);
                console.log(response.statusText);
            }
            await filterProducts([await readResponse(response), filter.value, e]);
            break;
        default:
            await filterProducts([{}, filter.value, e]);
    }
}

async function applyFilter(offset) {
    const params = {offset: offset, limit: 50};
    const productsCard = await getItems(params);
    const result = productsCard.result.reduce((o, i) => {
        if (!o.find(v => v.id === i.id)) {
            o.push(i);
        }
        return o;
    }, []);
    if (result.length < 50) {
        let items = await getItems({
            offset: params.limit,
            limit: params.limit - result.length
        });
        for (let item of items.result) {
            if (!result.find(v => v.id === item.id)) {
                result.push(item);
            }
        }
        return result;
    }
    return result;
}

function toCard(product) {
    return `
            <div class="mui--text-headline">${product.product}</div>
            <div class="mui--text-black-54"><b>BRAND: ${product.brand}</b></div>
            <div>PRICE: ${product.price}</div>
            <div>ID: ${product.id}</div>
            <br>
`
}

async function renderCard(offset) {
    const parent = document.getElementById('list_products');
    const productsCard = await applyFilter(offset);
    const html = Object.keys(productsCard).length
        ? productsCard.map(toCard).join('')
        : `<div class="mui--text-black-54 mui--text-body2">Список товаров пока пуст</div>`;
    parent.innerHTML = html;
}

(function navigation() {
    const progress = document.getElementById('progress');
    const prev = document.getElementById('prev');
    const next = document.getElementById('next');
    const circles = document.querySelectorAll('.circle');

    let currentActive = 1;
    let offset = 0;

    next.addEventListener('click', async () => {
        currentActive++;
        offset += 50;
        if (currentActive > circles.length) {
            currentActive = circles.length;
        }
        await renderCard(offset);
        update();
    });
    prev.addEventListener('click', async () => {
        currentActive--;
        offset -= 50;

        if (currentActive < 1) {
            currentActive = 1;
        }
        const productsCard = await applyFilter(offset);
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



