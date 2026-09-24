"use client";

import { Card, EmptyState, Icon } from "@/components/ui";
import { useMyTodos, useCompleteTodo, type MyTodo } from "@/modules/student/api/todos";
import { formatDisplayDate } from "@/lib/utils/date";

function TodoRow({ todo, completing, onToggle }: { todo: MyTodo; completing: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-start gap-3 border-b border-divider py-3.5 last:border-0 last:pb-0 first:pt-0">
      <button
        onClick={onToggle}
        disabled={todo.is_completed || completing}
        className="mt-0.5 shrink-0 text-subtle transition-colors hover:text-primary disabled:hover:text-subtle"
      >
        <Icon name={todo.is_completed ? "check_box" : "check_box_outline_blank"} size={21} className={todo.is_completed ? "text-primary" : undefined} />
      </button>

      <div className="min-w-0 flex-1">
        <div className={`text-[14.5px] font-bold text-ink ${todo.is_completed ? "text-muted line-through" : ""}`}>{todo.title}</div>
        {todo.description && (
          <p className={`mt-0.5 text-[13px] text-body ${todo.is_completed ? "text-muted line-through" : ""}`}>{todo.description}</p>
        )}

        {(todo.deadline || todo.pdf_url || todo.link_url) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-3.5">
            {todo.deadline && <span className="text-[11.5px] text-subtle">Due {formatDisplayDate(todo.deadline)}</span>}
            {todo.pdf_url && (
              <a href={todo.pdf_url} target="_blank" rel="noreferrer" className="text-[11.5px] font-bold text-primary hover:underline">
                View PDF
              </a>
            )}
            {todo.link_url && (
              <a href={todo.link_url} target="_blank" rel="noreferrer" className="text-[11.5px] font-bold text-primary hover:underline">
                Open link
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TodoPage() {
  const todos = useMyTodos();
  const completeTodo = useCompleteTodo();

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Todo</h1>
        <p className="mt-1 text-[13px] text-muted">Questions and tasks posted by the Placement Cell.</p>
      </div>

      {todos.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : !todos.data || todos.data.length === 0 ? (
        <Card>
          <EmptyState message="Nothing from the Placement Cell yet." />
        </Card>
      ) : (
        <Card>
          {todos.data.map((t) => (
            <TodoRow
              key={t.id}
              todo={t}
              completing={completeTodo.isPending && completeTodo.variables === t.id}
              onToggle={() => completeTodo.mutate(t.id)}
            />
          ))}
        </Card>
      )}
    </div>
  );
}
