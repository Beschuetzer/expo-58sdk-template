import {
  agreeToRelationshipRule,
  createRelationshipRule,
  deleteRelationshipRule,
  getRelationshipRule,
  getRelationshipRules,
  updateRelationshipRule,
} from './api';

const mockRequestAuthenticatedJson = jest.fn();

jest.mock('@/features/auth/authenticatedClient', () => ({
  requestAuthenticatedJson: (...args: unknown[]) =>
    mockRequestAuthenticatedJson(...args),
}));

describe('relationship rule API', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('lists rules with an encoded relationship ID and filters', async () => {
    mockRequestAuthenticatedJson.mockResolvedValue({ data: { items: [] } });

    await getRelationshipRules('relationship one', {
      cursor: 'cursor one',
      limit: undefined,
    });

    expect(mockRequestAuthenticatedJson).toHaveBeenCalledWith(
      '/api/v1/relationships/relationship%20one/rules?cursor=cursor+one',
      {},
    );
  });

  it('omits the query string when listing rules without filters', async () => {
    mockRequestAuthenticatedJson.mockResolvedValue({ data: { items: [] } });

    await getRelationshipRules('relationship-1');

    expect(mockRequestAuthenticatedJson).toHaveBeenCalledWith(
      '/api/v1/relationships/relationship-1/rules',
      {},
    );
  });

  it('creates a rule using a JSON POST request', async () => {
    const input = {
      name: 'Quiet hours at home',
      labels: ['Home', 'Quiet'],
      description: 'Keep noise low after 9 PM.',
      requiredApproverUserIds: ['approver-1'],
    };
    mockRequestAuthenticatedJson.mockResolvedValue({ data: { id: 'rule-1' } });

    await createRelationshipRule('relationship-1', input);

    expect(mockRequestAuthenticatedJson).toHaveBeenCalledWith(
      '/api/v1/relationships/relationship-1/rules',
      { method: 'POST', body: JSON.stringify(input) },
    );
  });

  it('updates a rule by sending its name, labels, and description', async () => {
    const input = {
      name: 'Quiet hours at home',
      labels: ['Home', 'Quiet'],
      description: 'Keep noise low after 9 PM.',
    };
    mockRequestAuthenticatedJson.mockResolvedValue({ data: { id: 'rule-1' } });

    await updateRelationshipRule('rule one', input);

    expect(mockRequestAuthenticatedJson).toHaveBeenCalledWith(
      '/api/v1/relationship-rules/rule%20one',
      { method: 'PATCH', body: JSON.stringify(input) },
    );
  });

  it('gets a rule by its URL-encoded ID', async () => {
    mockRequestAuthenticatedJson.mockResolvedValue({ data: { id: 'rule-1' } });

    await getRelationshipRule('rule one');

    expect(mockRequestAuthenticatedJson).toHaveBeenCalledWith(
      '/api/v1/relationship-rules/rule%20one',
      {},
    );
  });

  it('deletes a rule by its URL-encoded ID', async () => {
    mockRequestAuthenticatedJson.mockResolvedValue({ data: undefined });

    await deleteRelationshipRule('rule one');

    expect(mockRequestAuthenticatedJson).toHaveBeenCalledWith(
      '/api/v1/relationship-rules/rule%20one',
      { method: 'DELETE' },
    );
  });

  it('agrees to a rule by its URL-encoded ID', async () => {
    mockRequestAuthenticatedJson.mockResolvedValue({ data: { id: 'rule-1' } });

    await agreeToRelationshipRule('rule one');

    expect(mockRequestAuthenticatedJson).toHaveBeenCalledWith(
      '/api/v1/relationship-rules/rule%20one/agree',
      { method: 'POST' },
    );
  });
});
