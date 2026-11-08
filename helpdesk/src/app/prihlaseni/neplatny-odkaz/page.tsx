import Link from "next/link";
import { Card, Heading, Page, buttonClass } from "@/components/ui";

/**
 * Odkaz nefunguje. Nerozlišujeme proč (propadl / už použitý / neexistuje) —
 * pro člověka je řešení stejné a útočníkovi to nic neřekne.
 */
export default function InvalidLinkPage() {
  return (
    <Page>
      <Heading>Odkaz už neplatí</Heading>
      <Card>
        <p className="text-sm leading-relaxed">
          Přihlašovací odkaz platí 30 minut a dá se použít jenom jednou. Tenhle
          už je buď starší, nebo jsi na něj klikl dvakrát.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Nic se nestalo — nech si poslat nový.
        </p>
        <div className="mt-5">
          <Link href="/" className={buttonClass}>
            Nechat poslat nový odkaz
          </Link>
        </div>
      </Card>
    </Page>
  );
}
