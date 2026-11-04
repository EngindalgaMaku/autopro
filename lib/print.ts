import { Capacitor, registerPlugin } from "@capacitor/core";

// window.print() does nothing inside the Android app; there the native print screen takes over
const AppPrint = registerPlugin<{ print(options: { title: string }): Promise<void> }>("AppPrint");

export function printPage(title = "AutoPro") {
  if (Capacitor.isNativePlatform()) return AppPrint.print({ title });
  window.print();
}
