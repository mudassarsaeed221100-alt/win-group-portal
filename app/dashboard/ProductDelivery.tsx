"use client";
import ComingSoonModule from "./ComingSoonModule";

export default function ProductDelivery() {
  return (
    <ComingSoonModule
      label="PRODUCTS"
      title="Product Delivery Management"
      subtitle="Future product dispatch aur delivery management."
      notice="Product delivery ka system abhi inactive rahega. Jab Founder product sales activate karega, tab approved orders ki delivery bhi activate hogi."
      features={[
        { title: "Pending Deliveries", description: "Payment approve hone ke baad delivery ke liye pending orders." },
        { title: "Delivery Assignment", description: "Orders ko delivery staff ya zimmedar banday ko assign karna." },
        { title: "Customer Details", description: "Customer ka naam, contact number aur address." },
        { title: "Dispatch Management", description: "Product dispatch ki date aur details." },
        { title: "Delivery Status", description: "Pending, dispatched, delivered aur failed status." },
        { title: "Delivery History", description: "Tamam completed aur pending deliveries ka record." },
      ]}
      steps={["Payment Approved", "Order Confirmed", "Dispatched", "Delivered"]}
    />
  );
}
