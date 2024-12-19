const { Client } = require('whatsapp-web.js');
const { LocalAuth } = require('whatsapp-web.js');
const { MessageMedia } = require('whatsapp-web.js');

const qrcode  = require('qrcode-terminal');

const fs = require('fs');
const path = require('path');


const numberTelephone = 'numero_telefono@c.us';

//crea el cliente de whatsapp y guarda la sesion en la carpeta sessions
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './sessions'
    })
}); 

//genera el qr en consola para scanearlo con el celular
client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
}); 

//envia un mensaje al propio numero de telefono cuando el cliente esta listo
client.on('ready', () => {
    client.sendMessage(numberTelephone, 'funcionando').then(response => {
        console.log('Mensaje enviado:', response);
    }).catch(err => {
        console.error('Error al enviar mensaje:',err);
    });
}); 

client.initialize(); //metodo para iniciar el cliente

//funcion que devuelve el archivo con numero sufijo mas alto
async function getLatestFile(basePath) {
    try {
        const dir = path.dirname(basePath);
        if(!fs.existsSync(dir)) {
            console.error('Directorio  no encontrado:', dir);
            return null
        }
        const basename = path.basename(basePath, path.extname(basePath));
        const files = fs.readdirSync(dir);

        const matchingFiles = files.filter(file => 
            file.startsWith(basename) && path.extname(file) === '.pdf'
        );

        if (matchingFiles.length === 0) {
            return null
        }

        let highestSuffix = 0;
        let latestFile = `${basename}.pdf`;

        matchingFiles.forEach(file => {
            const match = file.match(/ \((\d+)\)\.pdf$/);
            if (match) {
                const suffix = parseInt(match[1],10);
                if (suffix > highestSuffix) {
                    highestSuffix = suffix;
                    latestFile = file;
                }
            }
        });

    return path.join(dir, latestFile);
    } catch (error) {
        console.error('Error en getLatestFile:', error);
        return null;
    }
};

const typeMap = {
    cotizacion: 'cotizacion',
    cot: 'cotizacion',
    recibo: 'recibo',
    rec: 'recibo',
    'factura a': 'factura a',
    facturaa: 'factura a',
    'fac a': 'factura a',
    faca: 'factura a',
    'factura b': 'factura b',
    facturab: 'factura b',
    'fac b': 'factura b',
    facb: 'factura b',
    'nc a': 'nc a',
    nca: 'nc a',
    'nota a': 'nc a',
    notaa: 'nc a',
    'nc b': 'nc b',
    ncb: 'nc b',
    'nota b': 'nc b',
    notab: 'nc b',
}

client.on('message', async (message) => {
    let messageComplete = message.body;
    messageComplete = messageComplete.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    /*.normalize('NFD') separa las tildes de las vocales -> .replace('/[\u0300-\u036f]/g, '') quita esas tildes extras */
    const regex = /^(cotizacion|cot|recibo|rec|factura a|facturaa|fac a|faca|factura b|facturab|fac b|facb|nc a|nca|nota a|notaa|nc b|ncb|nota b|notab|)\s?(\d{3,5})$/;
    const match = messageComplete.match(regex);
    if (match) {
        let type = typeMap[match[1]] || null; //tipo de comprobante o null
        let number = match[2]; //numero de comprobante
        
        if (type) {
            let filePath;
            switch (type) {
                case 'cotizacion':
                    number = number.padStart(5, '0');
                    filePath = `Z:/Formularios/COTIZACION/COT_${number.padStart(13, '0')}/COT_${number.padStart(13, '0')}.pdf`;
                    break;
                case 'recibo':
                    number = number.padStart(5, '0');
                    filePath = `Z:/Formularios/recibo/RECM00005${number.padStart(8, '0')}/RECM00005${number.padStart(8, '0')}.pdf`;
                    break;
                case 'factura a':
                    number = number.padStart(5, '0');
                    filePath = `Z:/COMPROBANTES/FACA00005${number.padStart(8, '0')}/FACA00005${number.padStart(8, '0')}.pdf`;
                    break;
                case 'factura b':
                    number = number.padStart(5, '0');
                    filePath = `Z:/COMPROBANTES/FACB00005${number.padStart(8, '0')}/FACB00005${number.padStart(8, '0')}.pdf`;
                    break;
                case 'nc a':
                    number = number.padStart(5, '0');
                    filePath = `Z:/COMPROBANTES/N_CA00005${number.padStart(8, '0')}/N CA00005${number.padStart(8, '0')}.pdf`;
                    break;
                case 'nc b':
                    number = number.padStart(5, '0');
                    filePath = `Z:/COMPROBANTES/N_CB00005${number.padStart(8, '0')}/N CB00005${number.padStart(8, '0')}.pdf`;
                    break;
            }
            const latestFile = await getLatestFile(filePath);
            if (latestFile) {
                fs.access(latestFile, fs.constants.F_OK, async (err) => {
                    if (err) {
                        console.error('El archivo no existe:', latestFile);
                        await client.sendMessage(message.from, 'El número de comprobante no existe.');
                    } else {
                        try {
                            const media = MessageMedia.fromFilePath(latestFile);
                            await client.sendMessage(message.from, media);
                            console.log(`Archivo enviado ${latestFile} correctamente`);
                        } catch (error) {
                            console.error('Error al enviar el archivo:', error);
                            await client.sendMessage(message.from, 'Error al enviar el archivo.');
                        }
                    }
                });
            } else {
                await client.sendMessage(message.from, 'El número de comprobante no existe.');
            }
        } else {
            await client.sendMessage(message.from, 'No me doy cuenta de que tipo de comprobante me estas pidiendo.');
        }
    }
});

client.on('message_create', message => {
    console.log(message.body);

    if (message.body === '!ping') {
        message.reply('pong');
    }
});