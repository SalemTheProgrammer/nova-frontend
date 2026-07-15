import { useState } from "react"
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { useResource } from "@/lib/useResource"
import { downtimeApi, machinesApi } from "@/lib/api"
import { CAUSES_ARRET, type CauseArret } from "@/lib/types"
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Page,
  Select,
  Table,
  Td,
  TextInput,
  Th,
} from "@/components/dashboard/primitives"

const PAGE_SIZE = 5

function duree(s: string | null): string {
  if (s == null) return "—"
  const total = Number(s)
  const min = Math.floor(total / 60)
  const sec = Math.round(total % 60)
  return `${min}m ${sec}s`
}

export function ArretsPage() {
  const [machineId, setMachineId] = useState<number | null>(null)
  const [cause, setCause] = useState<CauseArret | "">("")
  const [dateDebut, setDateDebut] = useState("")
  const [dateFin, setDateFin] = useState("")
  const [page, setPage] = useState(1)

  const { data: machines } = useResource(() => machinesApi.list(), [])

  const { data: actifsData, loading: loadingActifs, error: errorActifs, reload: reloadActifs } =
    useResource(
      () =>
        downtimeApi.list({
          actifsSeulement: true,
          machineId: machineId ?? undefined,
          cause: cause || undefined,
          pageSize: 200,
        }),
      [machineId, cause],
    )

  const {
    data: historiqueData,
    loading: loadingHistorique,
    error: errorHistorique,
    reload: reloadHistorique,
  } = useResource(
    () =>
      downtimeApi.list({
        resolusSeulement: true,
        machineId: machineId ?? undefined,
        cause: cause || undefined,
        dateDebut: dateDebut ? new Date(dateDebut).toISOString() : undefined,
        dateFin: dateFin ? new Date(`${dateFin}T23:59:59`).toISOString() : undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [machineId, cause, dateDebut, dateFin, page],
  )

  const actifs = actifsData?.items ?? []
  const historique = historiqueData?.items ?? []
  const total = historiqueData?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function updateFilter(apply: () => void) {
    apply()
    setPage(1)
  }

  function reload() {
    reloadActifs()
    reloadHistorique()
  }

  return (
    <Page
      title="Arrêts"
      description="Suivi des arrêts machine — actifs et historique, avec cause et impact sur la disponibilité."
      actions={
        <Button variant="outline" onClick={reload}>
          <RefreshCw className="size-4" /> Actualiser
        </Button>
      }
    >
      <ErrorBanner message={errorActifs} />
      <ErrorBanner message={errorHistorique} />

      <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-4">
        <Field label="Machine">
          <Select
            value={machineId ?? ""}
            onChange={(e) =>
              updateFilter(() =>
                setMachineId(e.target.value ? Number(e.target.value) : null),
              )
            }
          >
            <option value="">Toutes</option>
            {(machines ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.code}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cause">
          <Select
            value={cause}
            onChange={(e) =>
              updateFilter(() => setCause(e.target.value as CauseArret | ""))
            }
          >
            <option value="">Toutes</option>
            {CAUSES_ARRET.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ").toLowerCase()}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Du">
          <TextInput
            type="date"
            value={dateDebut}
            onChange={(e) => updateFilter(() => setDateDebut(e.target.value))}
          />
        </Field>
        <Field label="Au">
          <TextInput
            type="date"
            value={dateFin}
            onChange={(e) => updateFilter(() => setDateFin(e.target.value))}
          />
        </Field>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-semibold">
            Arrêts actifs {actifs.length > 0 && <Badge tone="red">{actifs.length}</Badge>}
          </h3>
          {loadingActifs ? (
            <EmptyState message="Chargement…" />
          ) : actifs.length === 0 ? (
            <EmptyState message="Aucun arrêt actif." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Machine</Th>
                  <Th>Cause</Th>
                  <Th>Commentaire</Th>
                  <Th>Depuis</Th>
                </tr>
              </thead>
              <tbody>
                {actifs.map((d) => (
                  <tr key={d.id}>
                    <Td className="font-mono text-xs">{d.code_machine}</Td>
                    <Td>{d.cause.replace(/_/g, " ").toLowerCase()}</Td>
                    <Td className="text-muted-foreground">{d.operator_comment ?? "—"}</Td>
                    <Td>{new Date(d.start_time).toLocaleTimeString("fr-FR")}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Historique</h3>
          {loadingHistorique ? (
            <EmptyState message="Chargement…" />
          ) : historique.length === 0 ? (
            <EmptyState message="Aucun arrêt résolu." />
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <Th>Machine</Th>
                    <Th>Cause</Th>
                    <Th>Début</Th>
                    <Th>Fin</Th>
                    <Th className="text-right">Durée</Th>
                    <Th>OF lié</Th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map((d) => (
                    <tr key={d.id}>
                      <Td className="font-mono text-xs">{d.code_machine}</Td>
                      <Td>{d.cause.replace(/_/g, " ").toLowerCase()}</Td>
                      <Td>{new Date(d.start_time).toLocaleString("fr-FR")}</Td>
                      <Td>{d.end_time ? new Date(d.end_time).toLocaleString("fr-FR") : "—"}</Td>
                      <Td className="text-right">{duree(d.duree_s)}</Td>
                      <Td className="text-muted-foreground">
                        {d.ordre_fabrication_id ?? "—"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {total} arrêt{total > 1 ? "s" : ""} · page {page} / {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4" /> Page précédente
                  </Button>
                  <Button
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Page suivante <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Page>
  )
}
