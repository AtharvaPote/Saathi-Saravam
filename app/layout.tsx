import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Saathi · A little help. In your own words.',description:'Your everyday voice companion for your business and your farm.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
