export type ProvisioningJobPayload = {
  orderId: string;
  paymentIntentId: string;
  requestId: string;
};

export interface ProvisioningQueue {
  enqueueProvisioning(payload: ProvisioningJobPayload): Promise<void>;
}

export class DatabaseBackedProvisioningQueue implements ProvisioningQueue {
  async enqueueProvisioning(payload: ProvisioningJobPayload): Promise<void> {
    // Placeholder: insert into provisioning_jobs in the database-backed worker implementation.
    void payload;
  }
}

let queue: ProvisioningQueue | null = null;

export function getProvisioningQueue() {
  queue ??= new DatabaseBackedProvisioningQueue();
  return queue;
}
