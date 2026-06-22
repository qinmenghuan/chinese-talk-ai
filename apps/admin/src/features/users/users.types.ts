import type {
  AdminUpdateUserRequest,
  AdminUserDetail,
  AdminUserListItem,
} from "@learn-chinese-ai/shared-types";

export interface UsersFilters {
  keyword: string;
  createdFrom: string;
  createdTo: string;
}

export interface UsersPaginationState {
  page: number;
  pageSize: number;
}

export type UserListItem = AdminUserListItem;
export type UserDetail = AdminUserDetail;
export type UserEditValues = AdminUpdateUserRequest;

export const defaultUsersFilters: UsersFilters = {
  keyword: "",
  createdFrom: "",
  createdTo: "",
};
