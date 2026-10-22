module scan_ff(
  input clk,
  input rst,
  input se,
  input si,
  input d,
  output reg q
);
  wire d_mux;
  assign d_mux = se ? si : d;
  always @(posedge clk) begin
    if (rst) q <= 1'b0;
    else q <= d_mux;
  end
endmodule
