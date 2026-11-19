"use client";
import ComingSoonModule from "./ComingSoonModule";

export default function ProductSalesOrders() {
  return (
    <ComingSoonModule
      label="PRODUCTS"
      title="Product Sales & Orders"
      subtitle="Future company sales aur order management."
      notice="Filhal WIN GROUP ka focus members aur teams ki growth par hai. Sales aur orders ka system Founder ki approval tak inactive rahega."
      features={[
        { title: "Customer Orders", description: "Customers ke tamam product orders ka record." },
        { title: "Staff Sales Records", description: "Kis Staff ne kis customer ko product becha." },
        { title: "Selling Price", description: "Staff customer ko selling price batayega." },
        { title: "Company Payment", description: "Customer ki payment company account mein aayegi." },
        { title: "Order Tracking", description: "Pending, confirmed, processing aur completed orders." },
        { title: "Order History", description: "Purane orders aur customer purchase history." },
      ]}
      steps={["Staff", "Customer", "Company Payment", "Order Processing", "Delivery"]}
    />
  );
}
