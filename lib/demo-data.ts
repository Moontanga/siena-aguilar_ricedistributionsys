export type RiceProduct = { id: string; sku: string; name: string; category: string; sackWeightKg: number; costPerKg: number; pricePerKg: number; pricePerSack: number; stockKg: number; lowStockKg: number };
export const initialProducts: RiceProduct[] = [
 {id:'r1',sku:'RICE-001',name:'Sinandomeng Premium',category:'Premium',sackWeightKg:50,costPerKg:43,pricePerKg:49,pricePerSack:2400,stockKg:1250,lowStockKg:200},
 {id:'r2',sku:'RICE-002',name:'Jasmine Rice',category:'Premium',sackWeightKg:25,costPerKg:48,pricePerKg:55,pricePerSack:1325,stockKg:625,lowStockKg:100},
 {id:'r3',sku:'RICE-003',name:'Well Milled Rice',category:'Regular',sackWeightKg:50,costPerKg:38,pricePerKg:44,pricePerSack:2150,stockKg:950,lowStockKg:150},
 {id:'r4',sku:'RICE-004',name:'Dinorado',category:'Premium',sackWeightKg:25,costPerKg:50,pricePerKg:58,pricePerSack:1400,stockKg:175,lowStockKg:100},
 {id:'r5',sku:'RICE-005',name:'Long Grain Rice',category:'Regular',sackWeightKg:50,costPerKg:36,pricePerKg:42,pricePerSack:2050,stockKg:75,lowStockKg:100},
];
export const initialSales = [
 {id:'SA-20261015-001',customer:'Walk-in Customer',items:3,total:7250,paid:7250,method:'Cash',date:'2026-10-15',status:'Paid'},
 {id:'SA-20261015-002',customer:'Mendoza Sari-Sari Store',items:2,total:4800,paid:3000,method:'GCash',date:'2026-10-15',status:'Partial'},
 {id:'SA-20261014-018',customer:'Ramos Mini Mart',items:4,total:10250,paid:10250,method:'Cash',date:'2026-10-14',status:'Paid'},
 {id:'SA-20261014-017',customer:'Walk-in Customer',items:1,total:1325,paid:1325,method:'Cash',date:'2026-10-14',status:'Paid'},
 {id:'SA-20261013-016',customer:'Santos Grocery',items:5,total:14400,paid:0,method:'Credit',date:'2026-10-13',status:'Unpaid'},
];
