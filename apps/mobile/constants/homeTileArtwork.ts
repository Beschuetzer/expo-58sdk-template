export const HOME_TILE_ARTWORK = {
  awaitingDecision: require('../assets/images/home-tiles/tile-awaiting-decision.jpg'),
  findRelationship: require('../assets/images/home-tiles/tile-find-relationship.jpg'),
  createRelationship: require('../assets/images/home-tiles/tile-create-relationship.jpg'),
  incompleteTasks: require('../assets/images/home-tiles/tile-incomplete-tasks.jpg'),
  completedTasks: require('../assets/images/home-tiles/tile-completed-tasks.jpg'),
  createTask: require('../assets/images/home-tiles/tile-create-task.jpg'),
  viewRequests: require('../assets/images/home-tiles/tile-view-requests.jpg'),
  createRequest: require('../assets/images/home-tiles/tile-create-request.jpg'),
  viewJointAccountCharges: require('../assets/images/home-tiles/tile-view-joint-account-charges.jpg'),
  createJointAccountCharge: require('../assets/images/home-tiles/tile-create-joint-account-charge.jpg'),
  viewBudgets: require('../assets/images/home-tiles/tile-view-budgets.jpg'),
  createBudget: require('../assets/images/home-tiles/tile-create-budget.jpg'),
  viewMeTime: require('../assets/images/home-tiles/tile-view-me-time.jpg'),
  createMeTime: require('../assets/images/home-tiles/tile-create-me-time.jpg'),
  loveMakingSessions: require('../assets/images/home-tiles/tile-love-making-sessions.jpg'),
  dateNights: require('../assets/images/home-tiles/tile-date-nights.jpg'),
  viewRules: require('../assets/images/home-tiles/tile-view-rules.jpg'),
  createRule: require('../assets/images/home-tiles/tile-create-rule.jpg'),
} as const;

export const TILE_SETS = ['default', 'futuristic', 'classic', 'none'] as const;
export type TileSet = (typeof TILE_SETS)[number];
export type HomeTileArtworkKey = keyof typeof HOME_TILE_ARTWORK;

type TileArtworkSource = (typeof HOME_TILE_ARTWORK)[HomeTileArtworkKey];
type TileArtworkSet = Record<HomeTileArtworkKey, TileArtworkSource>;

const FUTURISTIC_TILE_ARTWORK: TileArtworkSet = {
  awaitingDecision: require('../assets/images/home-tiles/futuristic/tile-awaiting-decision.jpg'),
  findRelationship: require('../assets/images/home-tiles/futuristic/tile-find-relationship.jpg'),
  createRelationship: require('../assets/images/home-tiles/futuristic/tile-create-relationship.jpg'),
  incompleteTasks: require('../assets/images/home-tiles/futuristic/tile-incomplete-tasks.jpg'),
  completedTasks: require('../assets/images/home-tiles/futuristic/tile-completed-tasks.jpg'),
  createTask: require('../assets/images/home-tiles/futuristic/tile-create-task.jpg'),
  viewRequests: require('../assets/images/home-tiles/futuristic/tile-view-requests.jpg'),
  createRequest: require('../assets/images/home-tiles/futuristic/tile-create-request.jpg'),
  viewJointAccountCharges: require('../assets/images/home-tiles/futuristic/tile-view-joint-account-charges.jpg'),
  createJointAccountCharge: require('../assets/images/home-tiles/futuristic/tile-create-joint-account-charge.jpg'),
  viewBudgets: require('../assets/images/home-tiles/futuristic/tile-view-budgets.jpg'),
  createBudget: require('../assets/images/home-tiles/futuristic/tile-create-budget.jpg'),
  viewMeTime: require('../assets/images/home-tiles/futuristic/tile-view-me-time.jpg'),
  createMeTime: require('../assets/images/home-tiles/futuristic/tile-create-me-time.jpg'),
  loveMakingSessions: require('../assets/images/home-tiles/futuristic/tile-love-making-sessions.jpg'),
  dateNights: require('../assets/images/home-tiles/futuristic/tile-date-nights.jpg'),
  viewRules: require('../assets/images/home-tiles/futuristic/tile-view-rules.jpg'),
  createRule: require('../assets/images/home-tiles/futuristic/tile-create-rule.jpg'),
};

const CLASSIC_TILE_ARTWORK: TileArtworkSet = {
  awaitingDecision: require('../assets/images/home-tiles/classic/tile-awaiting-decision.jpg'),
  findRelationship: require('../assets/images/home-tiles/classic/tile-find-relationship.jpg'),
  createRelationship: require('../assets/images/home-tiles/classic/tile-create-relationship.jpg'),
  incompleteTasks: require('../assets/images/home-tiles/classic/tile-incomplete-tasks.jpg'),
  completedTasks: require('../assets/images/home-tiles/classic/tile-completed-tasks.jpg'),
  createTask: require('../assets/images/home-tiles/classic/tile-create-task.jpg'),
  viewRequests: require('../assets/images/home-tiles/classic/tile-view-requests.jpg'),
  createRequest: require('../assets/images/home-tiles/classic/tile-create-request.jpg'),
  viewJointAccountCharges: require('../assets/images/home-tiles/classic/tile-view-joint-account-charges.jpg'),
  createJointAccountCharge: require('../assets/images/home-tiles/classic/tile-create-joint-account-charge.jpg'),
  viewBudgets: require('../assets/images/home-tiles/classic/tile-view-budgets.jpg'),
  createBudget: require('../assets/images/home-tiles/classic/tile-create-budget.jpg'),
  viewMeTime: require('../assets/images/home-tiles/classic/tile-view-me-time.jpg'),
  createMeTime: require('../assets/images/home-tiles/classic/tile-create-me-time.jpg'),
  loveMakingSessions: require('../assets/images/home-tiles/classic/tile-love-making-sessions.jpg'),
  dateNights: require('../assets/images/home-tiles/classic/tile-date-nights.jpg'),
  viewRules: require('../assets/images/home-tiles/classic/tile-view-rules.jpg'),
  createRule: require('../assets/images/home-tiles/classic/tile-create-rule.jpg'),
};

const TILE_SET_ARTWORK: Partial<Record<TileSet, TileArtworkSet>> = {
  default: HOME_TILE_ARTWORK,
  futuristic: FUTURISTIC_TILE_ARTWORK,
  classic: CLASSIC_TILE_ARTWORK,
};

export function getHomeTileArtwork(
  tileSet: TileSet,
  artworkKey: HomeTileArtworkKey,
) {
  return TILE_SET_ARTWORK[tileSet]?.[artworkKey];
}
