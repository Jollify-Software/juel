export function parseTableToJson(table: HTMLTableElement): object[] {
    if (!table) {
        throw new Error('Invalid HTMLTableElement provided.');
    }

    // Extract headers from <thead>
    const headers: string[] = [];
    const thead = table.querySelector('thead');

    if (!thead) {
        throw new Error('Table must contain a <thead> element.');
    }

    const headerCells = thead.querySelectorAll('th');

    headerCells.forEach((cell, index) => {
        headers.push(cell.textContent?.trim() || `Column${index + 1}`);
    });

    // Extract data from <tbody>
    const tbody = table.querySelector('tbody');

    if (!tbody) {
        throw new Error('Table must contain a <tbody> element.');
    }

    const rows = tbody.querySelectorAll('tr');
    const data: object[] = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData: Record<string, string> = {};

        cells.forEach((cell, index) => {
            rowData[headers[index] || `Column${index + 1}`] = cell.textContent?.trim() || '';
        });

        data.push(rowData);
    });

    return data;
}