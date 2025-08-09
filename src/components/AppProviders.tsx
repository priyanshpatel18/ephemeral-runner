'use client'

import { ClusterProvider } from '@/components/Providers/ClusterProvider'
import { ReactQueryProvider } from '@/components/Providers/ReactQueryProvider'
import { SolanaProvider } from '@/components/Providers/SolanaProvider'
import { Provider } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import { ReactNode } from 'react'

export class SimpleProvider implements Provider {
  readonly connection: Connection;
  readonly publicKey?: PublicKey;

  constructor(connection: Connection, publicKey?: PublicKey) {
    this.connection = connection;
    this.publicKey = publicKey;
  }
}

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const endpoint = "https://rpc.magicblock.app/devnet"

  return (
    <ReactQueryProvider>
      <ClusterProvider>
        <SolanaProvider endpoint={endpoint}>{children}</SolanaProvider>
      </ClusterProvider>
    </ReactQueryProvider>
  )
}

