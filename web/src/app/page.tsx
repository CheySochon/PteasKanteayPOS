import Link from "next/link";
import { BarChart3, ChefHat, QrCode, Utensils } from "lucide-react";

export default function Home() {
  const links = [
    { href: "/admin", title: "Admin Dashboard", description: "Sales, orders, reports, inventory, tables, and users.", Icon: BarChart3 },
    { href: "/pos", title: "POS", description: "Create orders from products and tables.", Icon: Utensils },
    { href: "/kds", title: "Kitchen Display", description: "Track active orders and update kitchen status.", Icon: ChefHat },
    { href: "/qr/table-t-12", title: "QR Demo", description: "Guest ordering by table token. Try table-t-12.", Icon: QrCode },
  ];

  return (
    <main className="min-h-screen bg-[#f4f6f9] p-6 font-sans">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="text-sm font-bold uppercase text-[#1D9E75]">TheTofu POS</div>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">Choose a workspace</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">Use the admin tools, create counter orders, run the kitchen display, or test guest QR ordering.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {links.map(({ href, title, description, Icon }) => (
            <Link key={href} href={href} className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm transition hover:border-[#1D9E75] hover:shadow-md">
              <Icon className="mb-4 h-6 w-6 text-[#1D9E75]" />
              <div className="text-lg font-bold text-gray-950">{title}</div>
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            </Link>
          ))}
        </div>
      </div>
      </main>
  );
}
