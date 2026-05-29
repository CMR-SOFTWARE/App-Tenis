"use client";
// Formulario de configuración del perfil — Client Component

import { useActionState } from "react";
import { crearSlot } from "./actions";

export default function NuevoSlotForm() {
  // useActionState conecta el formulario con el Server Action
  // - state: lo que devuelve el action (null si no hay error, { error: "..." } si falla)
  // - formAction: se pasa al atributo action del <form>
  // - isPending: true mientras el server está procesando
  const [state, formAction, isPending] = useActionState(crearSlot, null);

  return (
    <form action={formAction} className="space-y-6">
      {/* Día */}
      <div>
        <label
          htmlFor="diaSemana"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Día
        </label>
        <select
          id="diaSemana"
          name="diaSemana"
          required
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
        >
          <option value="1">Lunes</option>
          <option value="2">Martes</option>
          <option value="3">Miércoles</option>
          <option value="4">Jueves</option>
          <option value="5">Viernes</option>
          <option value="6">Sábado</option>
          <option value="0">Domingo</option>
        </select>
      </div>

      {/* Hora */}
      <div>
        <label
          htmlFor="horaInicio"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Hora de inicio
        </label>
        <input
          id="horaInicio"
          name="horaInicio"
          type="time"
          required
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
        />
      </div>

      {/* Duración */}
      <div>
        <label
          htmlFor="duracionMin"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Duración (minutos)
        </label>
        <input
          id="duracionMin"
          name="duracionMin"
          type="number"
          min={30}
          max={180}
          defaultValue={60}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
        />
      </div>

      {/* Mensaje de error del server */}
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          {state.success}
        </div>
      )}

      {/* Botón de submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-green-700 text-white py-3.5 rounded-xl font-semibold hover:bg-green-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Agregando..." : "Agregar Horario"}
      </button>
    </form>
  );
}
