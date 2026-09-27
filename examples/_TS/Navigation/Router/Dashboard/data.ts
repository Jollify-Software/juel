// Fake data for the dashboard example. Generated once, from a fixed seed, so
// every page load (and every screenshot/scripted check) sees the same numbers.
import type { JuelRouter } from '../../../../../src/Navigation/Router/Router';

export type OrderStatus = 'open' | 'shipped' | 'cancelled';

export interface Customer {
    id: number;
    name: string;
    company: string;
    email: string;
    country: string;
    joined: string;
    notes: string;
}

export interface Order {
    id: number;
    customerId: number;
    date: string;
    status: OrderStatus;
    total: number;
    items: number;
}

// Tiny deterministic PRNG (mulberry32) — the data has to be identical on every
// load, so Math.random() is out.
function seeded(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const FIRST = ['Ada', 'Grace', 'Alan', 'Edsger', 'Barbara', 'Donald', 'Katherine',
    'Linus', 'Margaret', 'Dennis', 'Radia', 'Ken', 'Anita', 'Tim', 'Joan',
    'Guido', 'Sophie', 'Claude', 'Hedy', 'Mary'];
const LAST = ['Lovelace', 'Hopper', 'Turing', 'Dijkstra', 'Liskov', 'Knuth',
    'Johnson', 'Torvalds', 'Hamilton', 'Ritchie', 'Perlman', 'Thompson',
    'Borg', 'Berners-Lee', 'Clarke', 'Rossum', 'Wilson', 'Shannon',
    'Lamarr', 'Jackson'];
const COMPANY = ['Northwind Trading', 'Blue Harbour Ltd', 'Corvid Systems',
    'Pellucid Optics', 'Ferrous Works', 'Halcyon Foods', 'Tessellate',
    'Quay & Sons', 'Meridian Freight', 'Bramble Press'];
const COUNTRY = ['United Kingdom', 'Ireland', 'Germany', 'France', 'Spain',
    'Netherlands', 'Sweden', 'Portugal'];
const NOTES = [
    'Prefers email over phone. Invoices go to accounts@.',
    'On a 60-day payment term agreed in 2023.',
    'Asked to be told before any price change.',
    'Ships to a depot, not the registered address.',
    'Long-standing account — handle escalations personally.',
];

function build() {
    const rand = seeded(20260917);
    const customers: Customer[] = [];
    for (let i = 1; i <= 40; i++) {
        const first = FIRST[Math.floor(rand() * FIRST.length)];
        const last = LAST[Math.floor(rand() * LAST.length)];
        const company = COMPANY[Math.floor(rand() * COMPANY.length)];
        const month = 1 + Math.floor(rand() * 12);
        const day = 1 + Math.floor(rand() * 28);
        customers.push({
            id: i,
            name: `${first} ${last}`,
            company,
            email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}@${
                company.toLowerCase().replace(/[^a-z]/g, '')}.example`,
            country: COUNTRY[Math.floor(rand() * COUNTRY.length)],
            joined: `202${2 + Math.floor(rand() * 3)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            notes: NOTES[Math.floor(rand() * NOTES.length)],
        });
    }

    const statuses: OrderStatus[] = ['open', 'shipped', 'shipped', 'shipped', 'cancelled'];
    const orders: Order[] = [];
    for (let i = 0; i < 150; i++) {
        const month = 1 + Math.floor(rand() * 9);
        const day = 1 + Math.floor(rand() * 28);
        orders.push({
            id: 1000 + i,
            customerId: 1 + Math.floor(rand() * 40),
            date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            status: statuses[Math.floor(rand() * statuses.length)],
            total: Math.round((20 + rand() * 1800) * 100) / 100,
            items: 1 + Math.floor(rand() * 9),
        });
    }
    orders.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
    return { customers, orders };
}

const { customers, orders } = build();

// Stand-ins for a real API, with a delay so every view has a loading state to
// show (and so the router's `navigating` attribute and the "newest navigation
// wins" rule get exercised for real).
function delay<T>(value: T, ms = 350): Promise<T> {
    return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

export function fakeFetchCustomers(): Promise<Customer[]> {
    return delay(customers);
}

export function fakeFetchCustomer(id: string | number): Promise<Customer | null> {
    return delay(customers.find(c => c.id === Number(id)) ?? null);
}

export function fakeFetchOrders(filter?: { status?: OrderStatus; customerId?: number }): Promise<Order[]> {
    let result = orders;
    if (filter?.status) result = result.filter(o => o.status === filter.status);
    if (filter?.customerId != null) result = result.filter(o => o.customerId === filter.customerId);
    return delay(result);
}

export function fakeFetchOrder(id: string | number): Promise<Order | null> {
    return delay(orders.find(o => o.id === Number(id)) ?? null);
}

export interface Summary {
    revenue: number;
    openOrders: number;
    customers: number;
    averageOrder: number;
    // Revenue per month, for the line chart.
    months: string[];
    revenueByMonth: number[];
    // Order counts per status, for the doughnut.
    statusCounts: Record<OrderStatus, number>;
    recent: Order[];
}

export function fakeFetchSummary(): Promise<Summary> {
    const live = orders.filter(o => o.status !== 'cancelled');
    const months = Array.from(new Set(orders.map(o => o.date.slice(0, 7)))).sort();
    const revenueByMonth = months.map(m =>
        Math.round(live.filter(o => o.date.startsWith(m)).reduce((sum, o) => sum + o.total, 0)));
    const revenue = live.reduce((sum, o) => sum + o.total, 0);
    return delay({
        revenue,
        openOrders: orders.filter(o => o.status === 'open').length,
        customers: customers.length,
        averageOrder: revenue / live.length,
        months,
        revenueByMonth,
        statusCounts: {
            open: orders.filter(o => o.status === 'open').length,
            shipped: orders.filter(o => o.status === 'shipped').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length,
        },
        recent: orders.slice(0, 6),
    });
}

export function customerName(id: number): string {
    return customers.find(c => c.id === id)?.name ?? `Customer ${id}`;
}

export function money(value: number): string {
    return '£' + value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function routerOf(view: HTMLElement): JuelRouter {
    return view.closest('juel-router') as JuelRouter;
}

// The dashboard is hash-mode only, so links are written once, here.
export function href(path: string): string {
    return '#' + path;
}
