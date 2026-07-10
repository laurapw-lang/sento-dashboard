"use client";

import { useEffect, useState } from "react";

export type AsyncState<T> = { loading: boolean; error: string | null; data: T | null };

/** Ejecuta una promesa al montar; expone loading / error / data. */
export function useAsync<T>(fn: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: null, data: null });
    fn()
      .then((data) => alive && setState({ loading: false, error: null, data }))
      .catch((e) => alive && setState({ loading: false, error: e?.message ?? String(e), data: null }));
    return () => {
      alive = false;
    };
    // fn se define nueva por render; sólo queremos correr una vez al montar la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
