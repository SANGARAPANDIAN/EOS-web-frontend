"use client";

import { useState } from "react";
import { Button, Card, StatCard, SearchBar, Modal, ConfirmDialog, Select, Input, EmptyState, IconButton } from "@/components/ui";
import { SkeletonStatTiles, SkeletonCardGrid } from "@/components/ui/Skeleton";
import { ApiError } from "@/types/api";
import {
  useCanteenRecipes,
  useCanteenRecipesSummary,
  useUpsertRecipe,
  useDeleteRecipe,
  type CanteenRecipe,
} from "@/modules/canteen-admin/api/recipes";
import { useDishes } from "@/modules/canteen-admin/api/dishes";
import { useCanteenIngredients } from "@/modules/canteen-admin/api/ingredients";

interface IngredientLine {
  ingredient_id: string;
  quantity_needed: string;
  unit: string;
}

const EMPTY_LINE: IngredientLine = { ingredient_id: "", quantity_needed: "", unit: "" };

export default function CanteenRecipesPage() {
  const [search, setSearch] = useState("");
  const { data: recipes, isLoading, error } = useCanteenRecipes(search || undefined);
  const { data: summary } = useCanteenRecipesSummary();
  const { data: dishes } = useDishes();
  const { data: ingredientsData } = useCanteenIngredients();
  const upsertRecipe = useUpsertRecipe();
  const deleteRecipe = useDeleteRecipe();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CanteenRecipe | null>(null);
  const [dishId, setDishId] = useState("");
  const [lines, setLines] = useState<IngredientLine[]>([{ ...EMPTY_LINE }]);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CanteenRecipe | null>(null);

  const ingredients = ingredientsData?.items ?? [];

  function openCreate() {
    setEditing(null);
    setDishId("");
    setLines([{ ...EMPTY_LINE }]);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(recipe: CanteenRecipe) {
    setEditing(recipe);
    setDishId(String(recipe.dish.id));
    setLines(
      recipe.ingredients.map((i) => ({
        ingredient_id: String(i.ingredient_id),
        quantity_needed: String(i.quantity_needed),
        unit: i.unit,
      })),
    );
    setFormError(null);
    setModalOpen(true);
  }

  function updateLine(index: number, patch: Partial<IngredientLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setFormError(null);
    if (!dishId) {
      setFormError("Select a dish.");
      return;
    }
    const parsedLines = [];
    for (const line of lines) {
      if (!line.ingredient_id) continue;
      const qty = Number(line.quantity_needed);
      if (!line.quantity_needed || Number.isNaN(qty) || qty <= 0) {
        setFormError("Enter a valid quantity for every ingredient line.");
        return;
      }
      if (!line.unit.trim()) {
        setFormError("Enter a unit for every ingredient line (e.g. g, ml, pcs).");
        return;
      }
      parsedLines.push({ ingredient_id: Number(line.ingredient_id), quantity_needed: qty, unit: line.unit.trim() });
    }
    if (parsedLines.length === 0) {
      setFormError("Add at least one ingredient.");
      return;
    }

    try {
      await upsertRecipe.mutateAsync({ dish_id: Number(dishId), ingredients: parsedLines });
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteRecipe.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteTarget(null);
      alert(err instanceof ApiError ? err.message : "Could not delete this recipe.");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Recipes</h1>
          <p className="mt-1.5 text-[14px] font-medium text-muted">Define what ingredients each dish consumes.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={openCreate}>
          + Add Recipe
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Recipes" value={summary.total_recipes} icon="soup_kitchen" />
          <StatCard label="Available Dishes" value={summary.available_dishes} icon="restaurant" />
          <StatCard label="Available Ingredients" value={summary.available_ingredients} icon="inventory_2" />
        </div>
      )}
      {!summary && <SkeletonStatTiles count={3} />}

      <SearchBar placeholder="Search recipes by dish name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[360px]" />

      {error ? (
        <Card>
          <EmptyState message={error instanceof Error ? error.message : "Could not load recipes."} />
        </Card>
      ) : isLoading && !recipes ? (
        <SkeletonCardGrid count={4} columns={2} />
      ) : !recipes || recipes.length === 0 ? (
        <Card>
          <EmptyState message={search ? "No recipes match your search." : "No recipes yet — add your first one."} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {recipes.map((recipe) => (
            <Card key={recipe.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[15px] font-bold text-ink">{recipe.dish.name}</div>
                <div className="flex gap-3">
                  <button type="button" className="text-[12.5px] font-bold text-primary hover:text-primary-dark" onClick={() => openEdit(recipe)}>
                    Edit
                  </button>
                  <button type="button" className="text-[12.5px] font-bold text-danger-fg hover:opacity-80" onClick={() => setDeleteTarget(recipe)}>
                    Delete
                  </button>
                </div>
              </div>
              <div className="flex flex-col divide-y divide-border-default">
                {recipe.ingredients.map((ing) => (
                  <div key={ing.ingredient_id} className="flex items-center justify-between py-2 text-[13px]">
                    <span className="text-ink">{ing.name}</span>
                    <span className="text-muted">
                      {ing.quantity_needed} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Recipe" : "Add Recipe"} subtitle="Re-saving a dish's recipe replaces its ingredient list entirely.">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-bold text-muted">Dish</label>
            <Select value={dishId} onChange={(e) => setDishId(e.target.value)} disabled={!!editing}>
              <option value="">Select a dish…</option>
              {dishes?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-[12.5px] font-bold text-muted">Ingredients</label>
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[1.4fr_0.8fr_0.7fr_auto] items-center gap-2">
                <Select value={line.ingredient_id} onChange={(e) => updateLine(index, { ingredient_id: e.target.value })}>
                  <option value="">Select ingredient…</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name}
                    </option>
                  ))}
                </Select>
                <Input type="number" min={0} step="0.01" placeholder="Qty" value={line.quantity_needed} onChange={(e) => updateLine(index, { quantity_needed: e.target.value })} />
                <Input placeholder="Unit" value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} />
                <IconButton icon="delete" size={38} onClick={() => removeLine(index)} disabled={lines.length === 1} />
              </div>
            ))}
            <Button variant="text" className="w-auto self-start" onClick={addLine}>
              + Add Ingredient Line
            </Button>
          </div>

          {formError && <p className="text-[12.5px] font-semibold text-danger-fg">{formError}</p>}
          <div className="mt-2 flex justify-end gap-2.5">
            <Button variant="secondary" className="w-auto" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primarySmall" className="w-auto" loading={upsertRecipe.isPending} onClick={handleSave}>
              {editing ? "Save Changes" : "Add Recipe"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete the recipe for "${deleteTarget?.dish.name}"?`}
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
