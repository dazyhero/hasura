export interface HasuraActionPayload<T = any> {
  action: {
    name: string;
  };
  input: T;
  session_variables: Record<string, string>;
}

export interface HasuraEventPayload<T = any> {
  event: {
    session_variables: Record<string, string>;
    op: 'INSERT' | 'UPDATE' | 'DELETE' | 'MANUAL';
    data: {
      old: T | null;
      new: T | null;
    };
  };
  created_at: string;
  id: string;
  table: {
    schema: string;
    name: string;
  };
  trigger: {
    name: string;
  };
}
