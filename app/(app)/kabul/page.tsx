import { ComingNext } from "@/components/coming-next";

export const metadata = { title: "Araç Kabul" };

export default function Page() {
  return <ComingNext title="Araç Kabul" lines={["Plaka ile araç ve müşteri bulma", "Araç sınıfına göre hizmet fiyatı", "Üstten görünümde hasar işaretleme ve fotoğraf", "Müşteri onayı ve fiş"]} />;
}
