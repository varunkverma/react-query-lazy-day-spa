import { Dispatch, SetStateAction, useState, useCallback } from "react";
import { useQuery } from "react-query";
import type { Staff } from "../../../../../shared/types";
import { axiosInstance } from "../../../axiosInstance";
import { queryKeys } from "../../../react-query/constants";
import { filterByTreatment } from "../utils";

// for when we need a query function for useQuery
async function getStaff(): Promise<Staff[]> {
  const { data } = await axiosInstance.get("/staff");
  return data;
}

interface UseStaff {
  staff: Staff[];
  filter: string;
  setFilter: Dispatch<SetStateAction<string>>;
}

export function useStaff(): UseStaff {
  // for filtering staff by treatment
  const [filter, setFilter] = useState("all");

  const selectByTreatmentType = useCallback(
    (data) => filterByTreatment(data, filter),
    [filter]
  );

  // TODO: get data from server via useQuery
  const { data } = useQuery(queryKeys.staff, getStaff, {
    select: filter !== "all" ? selectByTreatmentType : undefined,
  });
  const staff = data || [];

  return { staff, filter, setFilter };
}
