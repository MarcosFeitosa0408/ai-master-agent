import {describe,it,expect} from "vitest";
import {CORE,filterRows,summarize,exportRowsCSV} from "./analytics-engine";
describe("Motor ERP integrado no AI MASTER AGENT", () => {
 it("mapeia colunas brasileiras de pagamento e estorno",()=>{
  const headers=["ID_Transacao","Data_Transacao","Canal","Forma_Pagamento","Status_Transacao","Valor_Transacao","Valor_Estornado"];
  const map=CORE.suggest(headers);
  expect(map).toMatchObject({order:0,date:1,channel:2,paymentMethod:3,status:4,revenue:5,refund:6});
  const result=CORE.convert([["T1","2026-11-01","Site","Pix","Estornado","100,00","30,00"]],map,{locale:"pt-BR",revenueMode:"gross"});
  expect(result.valid[0].revenue).toBe(70);
  expect(result.valid[0].refund).toBe(30);
  expect(result.valid[0].status).toBe("Estornado");
  expect(result.valid[0].paymentMethod).toBe("Pix");
  expect(summarize(result.valid).profit).toBeNull();
 });
 it("não inventa resultado quando há custo ausente",()=>{
  const rows=[{revenue:100,cost:60,order:"P1",company:"A",store:"Centro"},{revenue:200,cost:null,order:"P2",company:"A",store:"Centro"}];
  const s=summarize(rows);expect(s.revenue).toBe(300);expect(s.cost).toBeNull();expect(s.margin).toBeNull();
 });
 it("remove somente linhas idênticas autorizadas e mantém itens de mesmo pedido",()=>{
  const records=[["P1","100"],["P1","200"],["P1","100"]];
  const map={order:0,revenue:1};
  const a=CORE.convert(records,map),b=CORE.convert(records,map,{removeDuplicates:true});
  expect(a.valid).toHaveLength(3);expect(a.duplicates).toBe(1);
  expect(b.valid).toHaveLength(2);expect(b.removed).toBe(1);
 });
 it("filtra por canal, status e período",()=>{
  const rows=[{channel:"Site",status:"Aprovado",date:"2026-11-01"},{channel:"Loja",status:"Cancelado",date:"2026-10-01"}];
  expect(filterRows(rows,{channel:"Site",status:"Aprovado",from:"2026-11-01"})).toHaveLength(1);
 });
 it("exporta CSV neutralizando fórmulas",()=>{
  const data=exportRowsCSV([{company:"=2+2",revenue:10,cost:null}]);
  expect(data).toContain("'=2+2");
 });
});