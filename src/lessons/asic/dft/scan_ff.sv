module scan_ff(
  input clk,
  input rst,
  input se,
  input si,
  input d,
  output reg q
);
  wire d_mux;
  // TODO: when se is 1, the flip-flop loads si (scan). Otherwise it loads d.
  assign d_mux = d;
  always @(posedge clk) begin
    if (rst) q <= 1'b0;
    else q <= d_mux;
  end
endmodule
