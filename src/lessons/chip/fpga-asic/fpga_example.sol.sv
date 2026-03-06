// FPGA Resource Analysis:
// - 4-bit adder: ~4 LUTs (one per bit, using carry chain)
// - 4-bit mux: ~4 LUTs (one per bit)
// - 4-bit AND: can merge into output LUTs
// - result register: 4 flip-flops
// Total: ~8 LUTs + 4 FFs (fits in ~4 CLB slices)

module fpga_example(
  input        clk, reset,
  input  [3:0] a, b,
  input        sel,
  output reg [3:0] result
);
  wire [3:0] sum = a + b;
  wire [3:0] mux = sel ? a : b;

  always @(posedge clk) begin
    if (reset)
      result <= 4'b0;
    else
      result <= sum & mux;
  end
endmodule
