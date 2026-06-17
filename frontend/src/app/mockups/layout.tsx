import { Bebas_Neue, Oswald, Anton, Archivo, Space_Grotesk, Sora } from 'next/font/google';

const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-bebas' });
const oswald = Oswald({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-oswald' });
const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-anton' });
const archivo = Archivo({ subsets: ['latin'], weight: ['700', '800', '900'], variable: '--font-archivo' });
const space = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-space' });
const sora = Sora({ subsets: ['latin'], weight: ['600', '800'], variable: '--font-sora' });

export default function MockupsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${bebas.variable} ${oswald.variable} ${anton.variable} ${archivo.variable} ${space.variable} ${sora.variable}`}>
      {children}
    </div>
  );
}
