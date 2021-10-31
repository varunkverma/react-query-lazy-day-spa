import { useMutation, UseMutateFunction, useQueryClient } from "react-query";
import jsonpatch from "fast-json-patch";

import type { User } from "../../../../../shared/types";
import { axiosInstance, getJWTHeader } from "../../../axiosInstance";
import { useUser } from "./useUser";
import { useCustomToast } from "../../app/hooks/useCustomToast";
import { queryKeys } from "react-query/constants";

// for when we need a server function
async function patchUserOnServer(
  newData: User | null,
  originalData: User | null
): Promise<User | null> {
  if (!newData || !originalData) return null;
  // create a patch for the difference between newData and originalData
  const patch = jsonpatch.compare(originalData, newData);

  // send patched data to the server
  const { data } = await axiosInstance.patch(
    `/user/${originalData.id}`,
    { patch },
    {
      headers: getJWTHeader(originalData),
    }
  );
  return data.user;
}

// TODO: update type to UseMutateFunction type
export function usePatchUser(): UseMutateFunction<
  User,
  unknown,
  User,
  unknown
> {
  const { user, updateUser } = useUser();
  const toast = useCustomToast();
  const queryClient = useQueryClient();
  // TODO: replace with mutate function
  const { mutate: patchUser } = useMutation(
    (newUserData: User) => patchUserOnServer(newUserData, user),
    {
      // onMutate returns context that is passed to onError
      onMutate: async (newUserData: User | null) => {
        // cancel any outgoing queries for user data, so that old server data doesn't overwrite out optimistic update
        queryClient.cancelQueries(queryKeys.user);

        // snapshot if previous user value
        const previousCachedUserData: User = queryClient.getQueryData(
          queryKeys.user
        );

        // optimistically update the cache with the new user value
        updateUser(newUserData);

        // return context object with snapshot value
        return { previousUserData: previousCachedUserData };
      },
      onError: (error, newData, context) => {
        // roll bcak cache to saved value
        if (context.previousUserData) {
          updateUser(context.previousUserData);
          toast({
            title: "Update failed; restoring previous values",
            status: "warning",
          });
        }
      },
      onSuccess: (userData: User | null) => {
        if (userData) {
          updateUser(userData);
          toast({
            title: "User Updated",
            status: "success",
          });
        }
      },
      onSettled: () => {
        // invalidate user query to make sure we're in sync with the server ny triggering refetch
        queryClient.invalidateQueries(queryKeys.user);
      },
    }
  );

  return patchUser;
}
