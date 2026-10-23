import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { ShieldCheck, Loader, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import PageHeader, { Page } from "@/components/common/PageHeader";
import {
  farmerPhotoUrl,
  useApproveFarmerMutation,
  useGetPendingFarmersQuery,
  useRejectFarmerMutation,
} from "@/redux/f2home/adminApi";
import { formatDateTime } from "@/utils/expiry";

// The registration photo endpoint needs the admin's Bearer token (it isn't
// public like product media), so a plain <img src> can't load it - fetch it
// as a blob and hand the <img> an object URL instead.
function FarmerPhoto({ farmerId, hasPhoto }) {
  const token = useSelector((state) => state.auth?.token);
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hasPhoto || !token) return;
    let objectUrl;
    let cancelled = false;
    fetch(farmerPhotoUrl(farmerId), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.blob() : Promise.reject(res)))
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [farmerId, hasPhoto, token]);

  if (!hasPhoto || failed || !src) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#eef3e6] text-[#33691e]">
        <UserIcon className="h-7 w-7" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt="Registration photo"
      className="h-16 w-16 shrink-0 rounded-full object-cover"
    />
  );
}

// Admin: farmers waiting to be approved. Approving makes their listings
// visible in the marketplace; rejecting marks the account inactive (they can
// no longer log in). See AdminController / AdminFarmerService on the backend.
export default function FarmerApprovals() {
  const { toast } = useToast();
  const { data: farmers = [], isLoading, isError } = useGetPendingFarmersQuery(undefined, {
    pollingInterval: 30000,
  });
  const [approveFarmer, { isLoading: isApproving }] = useApproveFarmerMutation();
  const [rejectFarmer, { isLoading: isRejecting }] = useRejectFarmerMutation();
  const [pending, setPending] = useState(null); // { farmer, approve }

  const isDeciding = isApproving || isRejecting;

  const confirm = async () => {
    if (!pending) return;
    const { farmer, approve } = pending;
    try {
      await (approve ? approveFarmer(farmer.id) : rejectFarmer(farmer.id)).unwrap();
      toast({
        title: approve ? "Farmer approved" : "Farmer rejected",
        description: `${farmer.fullName} (${farmer.village}) ${
          approve ? "can now sell on the marketplace." : "will no longer be able to log in."
        }`,
      });
      setPending(null);
    } catch (err) {
      toast({
        title: `Couldn't ${approve ? "approve" : "reject"} farmer`,
        description: err?.data?.message || "Please try again.",
        variant: "destructive",
      });
      setPending(null);
    }
  };

  return (
    <Page>
      <PageHeader
        icon={ShieldCheck}
        title="Farmer Approvals"
        subtitle="Review new farmers before their produce goes live"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="h-8 w-8 animate-spin text-[#33691e]" />
        </div>
      ) : isError ? (
        <p className="text-sm text-red-600">Couldn't load pending farmers. Please try again.</p>
      ) : farmers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-muted-foreground dark:border-gray-700">
          No farmers waiting for approval.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {farmers.map((f) => (
            <div
              key={f.id}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center gap-3">
                <FarmerPhoto farmerId={f.id} hasPhoto={f.hasPhoto} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#2f3b2f] dark:text-white">{f.fullName}</p>
                  <p className="text-sm text-muted-foreground">{f.village}</p>
                  <p className="text-sm text-muted-foreground">{f.phoneNumber}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Registered {formatDateTime(f.createdAt)}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 flex-1 bg-[#33691e] px-3 text-xs text-white hover:bg-[#2e5d1a]"
                  onClick={() => setPending({ farmer: f, approve: true })}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setPending({ farmer: f, approve: false })}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!pending} onOpenChange={(open) => !open && !isDeciding && setPending(null)}>
        <DialogContent className="max-w-md">
          {pending && (
            <>
              <DialogHeader>
                <DialogTitle className={pending.approve ? "text-[#33691e]" : "text-red-600"}>
                  {pending.approve ? "Approve this farmer?" : "Reject this farmer?"}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm">
                <span className="font-medium">{pending.farmer.fullName}</span> · {pending.farmer.village} ·{" "}
                {pending.farmer.phoneNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {pending.approve
                  ? "Their listings will immediately become visible to customers nearby."
                  : "They will no longer be able to log in. You can reinstate them later if this was a mistake."}
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={isDeciding} onClick={() => setPending(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isDeciding}
                  onClick={confirm}
                  className={
                    pending.approve
                      ? "bg-[#33691e] text-white hover:bg-[#2e5d1a]"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }
                >
                  {isDeciding ? "Please wait..." : pending.approve ? "Confirm approve" : "Confirm reject"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
