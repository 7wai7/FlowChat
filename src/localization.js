import fs from 'fs';
import path from 'path';

const localesPath = path.join(process.cwd(), 'locales');

function loadLocale(lang) {
    try {
        const filePath = path.join(localesPath, `${lang}.json`);
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Помилка завантаження мови ${lang}:`, error);
        return {};
    }
}

export function translate(lang, key) {
    const translations = loadLocale(lang);

    return translations[key] || loadLocale("en")[key] || key;
    // Якщо перекладу немає, повертаїм існуючий
    // Якщо ключа немає, повертаємо сам ключ
}
