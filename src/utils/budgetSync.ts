import { Activity, ActivityCategory, BudgetCategory, BudgetItem } from '../types';
import { getUnitForCategory } from './constants';

export function mapActivityCategoryToBudgetCategory(cat: ActivityCategory): BudgetCategory {
  switch (cat) {
    case 'Food':
      return 'Food';
    case 'Cafe':
      return 'Cafe';
    case 'Sightseeing':
      return 'Tickets';
    case 'Hotel':
      return 'Hotel';
    case 'Transportation':
      return 'Transportation';
    case 'Shopping':
      return 'Shopping';
    case 'Entertainment':
      return 'Entertainment';
    case 'Other':
    default:
      return 'Other';
  }
}

/**
 * Sync all itinerary activities with cost into the Budget items list.
 * - If an activity has plannedCost > 0 or actualCost > 0:
 *   Ensures there is a corresponding BudgetItem with `activityId = activity.id`.
 * - If an activity has 0 cost and had an auto-generated budget item, removes it.
 * - If an activity was deleted and had an auto-generated budget item, removes it.
 */
export function syncItineraryToBudget(
  itinerary: Activity[],
  currentBudget: BudgetItem[],
  tripId: string
): { updatedBudget: BudgetItem[]; changed: boolean } {
  let changed = false;
  const budgetList = [...currentBudget];
  const activeActivityIds = new Set(itinerary.map((a) => a.id));

  // 1. Process each activity in the itinerary
  for (const act of itinerary) {
    const planned = Number(act.plannedCost) || 0;
    const actual = Number(act.actualCost) || 0;
    const hasCost = planned > 0 || actual > 0;

    // Find existing budget item for this activity
    // First by activityId, then by unlinked item with matching title & category
    let existingIndex = budgetList.findIndex((b) => b.activityId === act.id);
    if (existingIndex === -1) {
      existingIndex = budgetList.findIndex(
        (b) =>
          !b.activityId &&
          b.item.trim().toLowerCase() === act.title.trim().toLowerCase() &&
          b.category === mapActivityCategoryToBudgetCategory(act.category)
      );
    }

    if (existingIndex !== -1) {
      const existing = budgetList[existingIndex];
      if (hasCost) {
        const expectedCat = mapActivityCategoryToBudgetCategory(act.category);
        if (
          existing.activityId !== act.id ||
          existing.plannedCost !== planned ||
          existing.actualCost !== actual ||
          existing.item !== act.title ||
          existing.category !== expectedCat
        ) {
          changed = true;
          budgetList[existingIndex] = {
            ...existing,
            activityId: act.id,
            item: act.title,
            category: expectedCat,
            plannedCost: planned,
            actualCost: actual,
            notes: existing.notes
              ? existing.notes
              : act.note
              ? `${act.note} (${act.date} ${act.time})`
              : `Lịch trình ngày ${act.date} (${act.time})`
          };
        }
      } else {
        // Activity cost set to 0. If it was an auto-synced item, remove it
        if (existing.id.startsWith('budget-act-') || existing.activityId === act.id) {
          changed = true;
          budgetList.splice(existingIndex, 1);
        }
      }
    } else if (hasCost) {
      // Need to add new budget item
      changed = true;
      const cat = mapActivityCategoryToBudgetCategory(act.category);
      budgetList.push({
        id: `budget-act-${act.id}`,
        tripId: tripId || act.tripId,
        activityId: act.id,
        category: cat,
        item: act.title,
        quantity: 1,
        unit: getUnitForCategory(cat),
        plannedCost: planned,
        actualCost: actual,
        notes: act.note
          ? `${act.note} (${act.date} ${act.time})`
          : `Lịch trình ngày ${act.date} (${act.time})${act.location ? ` - ${act.location}` : ''}`
      });
    }
  }

  // 2. Remove orphaned items whose activity was deleted
  const cleanedBudget = budgetList.filter((b) => {
    if (b.activityId && !activeActivityIds.has(b.activityId)) {
      changed = true;
      return false;
    }
    return true;
  });

  return {
    updatedBudget: cleanedBudget,
    changed
  };
}

/**
 * When a budget item linked to an activity is edited or deleted in the Budget view,
 * update the corresponding activity in the itinerary to maintain two-way consistency.
 */
export function syncBudgetToItinerary(
  budget: BudgetItem[],
  currentItinerary: Activity[]
): { updatedItinerary: Activity[]; changed: boolean } {
  let changed = false;
  const budgetMapByActId = new Map<string, BudgetItem>();
  for (const b of budget) {
    if (b.activityId) {
      budgetMapByActId.set(b.activityId, b);
    }
  }

  const updatedItinerary = currentItinerary.map((act) => {
    const linked = budgetMapByActId.get(act.id);
    if (!linked) return act;

    const planned = (Number(linked.plannedCost) || 0) * (Number(linked.quantity) || 1);
    const actual = (Number(linked.actualCost) || 0) * (Number(linked.quantity) || 1);

    if (act.plannedCost !== planned || act.actualCost !== actual || act.title !== linked.item) {
      changed = true;
      return {
        ...act,
        title: linked.item,
        plannedCost: planned,
        actualCost: actual
      };
    }
    return act;
  });

  return {
    updatedItinerary,
    changed
  };
}
