import crypto from 'node:crypto';

// ============================================================================
// ⚠️ MOCK TEMPORAL - CONTRATO COMPACT / MIDNIGHT ZK
// Reemplazar cuando el equipo de ZK entregue los circuitos y el contrato esté deployado
// (ver CONTEXTO.md sección 5.5).
// ============================================================================

export interface RegistrarRecetaResult {
  success: boolean;
  commitment_hash: string;
  tx_id?: string;
}

export interface ValidarRecetaResult {
  valido: boolean;
  motivo?: string;
}

export class ContractService {
  /**
   * MOCK 1: Simula el registro del commitment hash en la blockchain Midnight.
   * // MOCK - reemplazar cuando ZK entregue el circuit real
   */
  static async registrarReceta(
    codigoMedicamento: string,
    fechaVigencia: string,
    secreto: string
  ): Promise<RegistrarRecetaResult> {
    console.log('⛓️ [MOCK ContractService] Registrando receta en blockchain...');
    const commitmentMock = `mock_commitment_${Date.now()}`;

    return {
      success: true,
      commitment_hash: commitmentMock,
      tx_id: `tx_mock_${Math.random().toString(36).substring(7)}`,
    };
  }

  /**
   * MOCK 2: Simula la validación de la prueba ZK / estado en el contrato Compact.
   * // MOCK - reemplazar cuando ZK entregue el circuit real
   */
  static async validarReceta(commitmentHash: string): Promise<ValidarRecetaResult> {
    console.log(`⛓️ [MOCK ContractService] Validando commitment: ${commitmentHash}`);
    return {
      valido: true,
    };
  }

  /**
   * MOCK 3: Deriva un compromiso de titularidad (holder commitment) a partir de un nonce.
   * // MOCK - reemplazar cuando ZK entregue el circuit real
   */
  static deriveHolderCommitment(nonce: string): string {
    console.log(`⛓️ [MOCK ContractService] Derivando holder commitment desde nonce...`);
    // Hash SHA-256 simple para simular la prueba
    return crypto.createHash('sha256').update(nonce).digest('hex');
  }

  /**
   * MOCK 4: Verifica si la prueba ZK de propiedad coincide con el commitment.
   * // MOCK - reemplazar cuando ZK entregue el circuit real
   */
  static async verificarProofPropiedad(commitment: string, proof: string): Promise<boolean> {
    console.log(`⛓️ [MOCK ContractService] Verificando prueba de propiedad para commitment: ${commitment}`);
    
    // Regla de prueba opcional: Si la proof enviada es "proof_invalida", simula fallo 403
    if (proof === 'proof_invalida') {
      return false;
    }

    return true; // Devuelve true por defecto para el flujo feliz
  }
}