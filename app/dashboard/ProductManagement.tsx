"use client";
import ComingSoonModule from "./ComingSoonModule";

export default function ProductManagement() {
  return (
    <ComingSoonModule
      label="PRODUCTS"
      title="Product Management"
      subtitle="Company ke tamam products ka future management system."
      notice="WIN GROUP ki pehli priority team building aur member growth hai. Product selling ka system Founder ki permission ke baad activate hoga."
      features={[
        { title: "Add New Products", description: "Founder naye products aur unki details add kar sakega." },
        { title: "Product Categories", description: "Products ko categories mein organize kiya jayega." },
        { title: "Product Pricing", description: "Company price aur selling price manage hogi." },
        { title: "Product Availability", description: "Available, out of stock aur inactive status." },
        { title: "Product Images", description: "Har product ki images aur description." },
        { title: "Product Activation", description: "Founder jab chahe selling system activate kar sakega." },
      ]}
    />
  );
}
