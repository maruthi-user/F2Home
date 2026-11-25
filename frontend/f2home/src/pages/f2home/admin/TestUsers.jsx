import { useId, useState } from "react";
import { ChevronLeft, ChevronRight, ListFilter, MoreHorizontal, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Page } from "@/components/common/PageHeader";
import { useGetLoginOptionsQuery } from "@/redux/f2home/authApi";
import { useGetTestUserQuery, useListTestUsersQuery, useManageTestUserMutation } from "@/redux/f2home/adminApi";

const roles = { FARMER: "Farmer", CUSTOMER: "Customer" };
const statuses = { ACTIVE: "Active", INACTIVE: "Disabled", PENDING_APPROVAL: "Pending approval" };
const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const field = "mt-1 min-h-11 w-full rounded-lg border bg-background px-3 py-2 text-base";
const primary = "bg-[#18542f] text-white";
const errorMessage = (error) => error?.data?.message || "Couldn’t complete the request. Try again.";

function Field({ name, label, error, ...props }) {
  const errorId = useId();
  return <label className="min-w-0 text-sm">
    {label}
    <input name={name} className={field} aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined} {...props} />
    {error && <span id={errorId} role="alert" className="mt-1 block text-red-600">{error}</span>}
  </label>;
}

function Coordinates({ location }) {
  return <div className="grid grid-cols-2 gap-3">
    <Field label="Latitude" name="lat" type="number" step="any" min="-90" max="90" required defaultValue={location?.lat} />
    <Field label="Longitude" name="lng" type="number" step="any" min="-180" max="180" required defaultValue={location?.lng} />
  </div>;
}

function UserForm({ user, busy, fieldError, onSave }) {
  const [role, setRole] = useState(user?.role || "CUSTOMER");
  const details = user?.details;
  const [hasAddress, setHasAddress] = useState(!!details?.customerAddress);
  const farm = details?.farm;
  const address = details?.customerAddress;

  function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const location = data.get("location");
    const coords = { lat: Number(data.get("lat")), lng: Number(data.get("lng")) };
    const updated = {
      fullName: data.get("fullName"), username: data.get("username"), phoneNumber: data.get("phoneNumber"), location,
      farm: role === "FARMER" ? {
        ...coords, locationLabel: data.get("farmLabel"), deliveryRadiusKm: Number(data.get("radius")), deliveryDays: data.getAll("days"),
      } : null,
      customerAddress: role === "CUSTOMER" && hasAddress ? {
        ...coords, street: data.get("street"), city: data.get("city"), pincode: data.get("pincode"),
      } : null,
    };
    onSave(user ? { id: user.id, body: updated } : {
      body: { details: updated, role, password: data.get("password"), pendingApproval: data.get("pending") === "on" },
    });
  }

  return <form onSubmit={submit} className="grid gap-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Full name" name="fullName" defaultValue={details?.fullName} required maxLength={120} />
      <Field label="Username" name="username" error={fieldError.username} defaultValue={details?.username} required minLength={3} maxLength={40}
        pattern="[A-Za-z0-9][A-Za-z0-9._\-]{2,39}" title="3–40 letters, numbers, dots, underscores or hyphens. Start with a letter or number." />
      <Field label="Phone number" name="phoneNumber" error={fieldError.phoneNumber} type="tel" defaultValue={details?.phoneNumber} required maxLength={25} />
      <Field label="Village or town" name="location" defaultValue={details?.location} required maxLength={120} />
      {!user && <>
        <label className="text-sm">Role
          <select value={role} onChange={(event) => setRole(event.target.value)} className={field}>
            {Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <Field label="Initial password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      </>}
    </div>
    {role === "FARMER" ? <fieldset className="grid gap-3 rounded-lg border p-3">
      <legend className="px-1 font-medium">Farm delivery settings</legend>
      <Field label="Farm location label" name="farmLabel" defaultValue={farm?.locationLabel} maxLength={255} required />
      <Coordinates location={farm} />
      <Field label="Delivery radius (km)" name="radius" type="number" min="1" max="100" step="any" defaultValue={farm?.deliveryRadiusKm} required />
      <div>
        <p className="mb-2 text-sm">Delivery days</p>
        <div className="flex flex-wrap gap-2">{days.map((day) =>
          <label key={day} className="flex min-h-10 items-center gap-1 rounded-md border px-2 text-sm">
            <input type="checkbox" name="days" value={day} defaultChecked={farm?.deliveryDays.includes(day)} />{day}
          </label>)}</div>
      </div>
      {!user && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pending" /> Start pending approval</label>}
    </fieldset> : <>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={hasAddress} onChange={(event) => setHasAddress(event.target.checked)} /> Set a default delivery address
      </label>
      {hasAddress && <fieldset className="grid gap-3 rounded-lg border p-3">
        <legend className="px-1 font-medium">Default delivery address</legend>
        <Field label="Street address" name="street" defaultValue={address?.street} maxLength={255} required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" name="city" defaultValue={address?.city} maxLength={100} required />
          <Field label="PIN code" name="pincode" defaultValue={address?.pincode} inputMode="numeric" pattern="[0-9]{6}" required />
        </div>
        <Coordinates location={address} />
      </fieldset>}
    </>}
    <Button type="submit" disabled={busy} className={primary}>{user ? "Save changes" : "Add user"}</Button>
  </form>;
}

export default function TestUsers() {
  const options = useGetLoginOptionsQuery();
  const enabled = options.data?.usernameEnabled === true;
  const [filters, setFilters] = useState({ page: 0, size: 10 });
  const [showFilters, setShowFilters] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const list = useListTestUsersQuery(filters, { skip: !enabled });
  const profile = useGetTestUserQuery(dialog?.user?.id, { skip: !enabled || dialog?.mode !== "edit" });
  const [manage, { isLoading: saving }] = useManageTestUserMutation();
  const rows = list.currentData?.users || [];
  const fieldError = {
    username: error.startsWith("This username") ? error : undefined,
    phoneNumber: /^(This phone number|Enter a valid mobile number)/.test(error) ? error : undefined,
  };

  function open(mode, user, status) {
    setError("");
    setNotice("");
    setDialog({ mode, user, status });
  }

  async function save(request) {
    if (saving) return;
    setError("");
    try {
      await manage(request).unwrap();
      setDialog(null);
      setNotice("User account updated.");
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  function actions(user, compact = false) {
    return <div className="flex flex-wrap gap-1.5 2xl:flex-nowrap">
      <Button size={compact ? "sm" : "default"} className={primary} onClick={() => open("edit", user)}>Edit</Button>
      <Button size={compact ? "sm" : "default"} variant="outline" onClick={() => open("password", user)}>Reset password</Button>
      <Button size={compact ? "sm" : "default"} variant="outline"
        className={compact && user.status !== "INACTIVE" ? "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950" : undefined}
        onClick={() => open("status", user, compact ? user.status === "INACTIVE" ? "ACTIVE" : "INACTIVE" : user.status)}>
        {compact ? user.status === "INACTIVE" ? "Reactivate" : "Deactivate" : "Change status"}
      </Button>
    </div>;
  }

  if (!enabled) return <Page><p role="status">{options.isFetching ? "Loading…" : "Test account management is unavailable."}</p></Page>;

  return <div className="phone-module w-full min-w-0 px-3 py-4 sm:px-4 lg:px-5">
    <header className="mb-3 flex items-center justify-between gap-3">
      <h1 className="text-xl font-semibold tracking-tight">User Management</h1>
      <Button className={primary + " shrink-0"} onClick={() => open("create")}><Plus aria-hidden /> Add user</Button>
    </header>
    <section aria-label="Test accounts" className="flex min-w-0 flex-col rounded-xl border bg-card lg:grid lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0 border-b p-2.5">
        <form className="flex min-w-0 flex-1 flex-wrap items-center gap-2" onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setFilters({ ...filters, q: data.get("q").trim(), page: 0 });
        }}>
          <label className="relative min-w-0 basis-full sm:max-w-72 sm:flex-1 sm:basis-auto">
            <span className="sr-only">Search users</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input name="q" type="search" maxLength={120} placeholder="Name, username or phone"
              className="h-11 w-full rounded-lg border bg-background pl-9 pr-3 text-base lg:h-9 lg:text-sm" />
          </label>
          <Button type="submit" variant="outline" size="sm">Search</Button>
          <Button type="button" variant="outline" size="sm" aria-expanded={showFilters} aria-controls="user-table-filters"
            onClick={() => setShowFilters(!showFilters)}>
            <ListFilter aria-hidden /> Filters
            {(filters.role || filters.status) && <span className="rounded-full bg-muted px-1.5">{Number(!!filters.role) + Number(!!filters.status)}</span>}
          </Button>
        </form>
      </div>
      <nav className="order-last flex flex-wrap items-center justify-between gap-2 border-t p-2.5 text-sm lg:order-none lg:justify-end lg:border-t-0 lg:border-b" aria-label="User table pagination">
          <label className="flex items-center gap-2">Rows
            <select value={filters.size} onChange={(event) => setFilters({ ...filters, page: 0, size: Number(event.target.value) })}
              className="h-9 rounded-lg border bg-background px-2">
              {[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <Button variant="outline" size="icon" aria-label="Previous page" disabled={!filters.page || list.isFetching}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}><ChevronLeft aria-hidden /></Button>
          <span aria-live="polite" className="min-w-12 text-center tabular-nums">
            {rows.length ? (filters.page * filters.size + 1) + "–" + (filters.page * filters.size + rows.length) : "0"}
          </span>
          <Button variant="outline" size="icon" aria-label="Next page" disabled={!list.currentData?.hasNext || list.isFetching}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}><ChevronRight aria-hidden /></Button>
      </nav>
      <div className="min-w-0 lg:col-span-2">
      {showFilters && <div id="user-table-filters" className="flex flex-wrap items-end gap-3 border-b bg-muted/20 p-3">
        <label className="text-sm">Role<select aria-label="Role" value={filters.role || ""} className={field}
          onChange={(event) => setFilters({ ...filters, role: event.target.value || undefined, page: 0 })}>
          <option value="">All roles</option>{Object.entries(roles).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select></label>
        <label className="text-sm">Status<select aria-label="Status" value={filters.status || ""} className={field}
          onChange={(event) => setFilters({ ...filters, status: event.target.value || undefined, page: 0 })}>
          <option value="">All statuses</option>{Object.entries(statuses).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select></label>
        <Button type="button" variant="outline" onClick={() => setFilters({ ...filters, role: undefined, status: undefined, page: 0 })}>Clear filters</Button>
      </div>}
      {notice && <p role="status" className="border-b px-3 py-2 text-sm">{notice}</p>}
      {list.isFetching && <p role="status" className="px-3 py-2 text-sm">Loading users…</p>}
      {list.isError && <p role="alert" className="p-3">{errorMessage(list.error)} <Button variant="outline" onClick={list.refetch}>Retry</Button></p>}
      {list.currentData && !rows.length && <p className="p-4 text-sm text-muted-foreground">No matching test accounts.</p>}
      {!!rows.length && <>
        <div className="grid gap-2.5 bg-muted/20 p-2.5 sm:grid-cols-2 lg:hidden">
          {rows.map((user) => <article key={user.id} className="min-w-0 space-y-3 rounded-lg border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="break-words font-semibold">{user.details.fullName}</h2>
                <p className="break-all text-sm text-muted-foreground">@{user.details.username} · #{user.id}</p>
              </div>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="shrink-0" aria-label={"Actions for " + user.details.fullName}>
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => open("edit", user)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => open("password", user)}>Reset password</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => open("status", user, user.status)}>Change status</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="rounded-full bg-muted px-2 py-1">{roles[user.role]}</span>
              <span className={user.status === "ACTIVE" ? "rounded-full bg-emerald-100 px-2 py-1 text-emerald-900" : "rounded-full bg-amber-100 px-2 py-1 text-amber-900"}>{statuses[user.status]}</span>
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 border-t pt-2 text-sm">
              <dt className="text-muted-foreground">Phone</dt><dd className="break-all">{user.details.phoneNumber}</dd>
              <dt className="text-muted-foreground">Location</dt><dd className="break-words">{user.details.location}</dd>
            </dl>
          </article>)}
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2.5">
            <thead className="border-b bg-muted/35 text-xs"><tr>
              {["User ID", "Name", "Username", "Role", "Contact no.", "Location", "Status", "Actions"].map((label) =>
                <th scope="col" key={label} className="whitespace-nowrap font-semibold">{label}</th>)}
            </tr></thead>
            <tbody className="divide-y">{rows.map((user) => <tr key={user.id} className="hover:bg-muted/25">
              <td className="tabular-nums text-muted-foreground">#{user.id}</td>
              <td className="min-w-24 break-words font-medium">{user.details.fullName}</td>
              <td className="break-all text-muted-foreground">{user.details.username}</td>
              <td><span className={user.role === "FARMER"
                ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900"
                : "rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900"}>{roles[user.role]}</span></td>
              <td className="whitespace-nowrap tabular-nums">{user.details.phoneNumber}</td>
              <td className="min-w-24 break-words">{user.details.location}</td>
              <td className="whitespace-nowrap text-xs font-medium">{statuses[user.status]}</td>
              <td>{actions(user, true)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
      </div>
    </section>
    <Dialog open={!!dialog} onOpenChange={(isOpen) => { if (!isOpen && !saving) setDialog(null); }}>
      <DialogContent className="phone-dialog max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-xl overflow-auto rounded-xl">
        <DialogHeader>
          <DialogTitle>{{ create: "Add user", edit: "Edit user", password: "Reset password", status: "Change status" }[dialog?.mode]}</DialogTitle>
          <DialogDescription>{dialog?.user?.details.fullName || "Create a farmer or customer test account."}</DialogDescription>
        </DialogHeader>
        {error && !fieldError.username && !fieldError.phoneNumber && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {dialog?.mode === "create" && <UserForm busy={saving} fieldError={fieldError} onSave={save} />}
        {dialog?.mode === "edit" && (profile.currentData ? <UserForm user={profile.currentData} busy={saving} fieldError={fieldError} onSave={save} />
          : profile.isError ? <p role="alert">{errorMessage(profile.error)}</p> : <p role="status">Loading user…</p>)}
        {dialog?.mode === "password" && <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          save({ id: dialog.user.id, action: "password", body: { password: new FormData(event.currentTarget).get("password") } });
        }}>
          <p className="text-sm">Existing sessions will be signed out.</p>
          <Field name="password" label="New password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
          <Button type="submit" disabled={saving} className={primary}>Set password</Button>
        </form>}
        {dialog?.mode === "status" && <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          save({ id: dialog.user.id, action: "status", body: { status: new FormData(event.currentTarget).get("status") } });
        }}>
          <label className="text-sm">Status<select name="status" aria-label="Status" defaultValue={dialog.status} className={field}>
            {Object.entries(statuses).filter(([id]) => id !== "PENDING_APPROVAL" || dialog.user.role === "FARMER")
              .map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select></label>
          <p className="text-sm">Disabling an account signs it out and blocks future sign-in.</p>
          <Button type="submit" disabled={saving} className={primary}>Save status</Button>
        </form>}
      </DialogContent>
    </Dialog>
  </div>;
}
