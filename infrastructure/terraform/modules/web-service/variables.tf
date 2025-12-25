variable "name" {
  type = string
}

variable "repo" {
  type = string
}

variable "branch" {
  type = string
}

variable "service_type" {
  type = string
}

variable "env" {
  type = string
}

variable "plan" {
  type = string
}

variable "build_command" {
  type = string
}

variable "start_command" {
  type = string
}

variable "env_variables" {
  type    = map(string)
  default = {}
}

variable "region" {
  type = string
}
